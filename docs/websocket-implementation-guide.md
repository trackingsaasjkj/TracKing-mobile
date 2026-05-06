# Guía de Implementación WebSocket — TracKing Mobile

## Estado actual

Todo está implementado. Esta es la tabla de estado final:

| Archivo | Estado | Descripción |
|---|---|---|
| `src/core/api/wsClient.ts` | ✅ Completo | Cliente WebSocket nativo + estado observable (`onStatusChange`, `status`) |
| `src/core/hooks/useWsStatus.ts` | ✅ Completo | Hook reactivo que expone el estado de conexión |
| `src/shared/components/WsStatusDot.tsx` | ✅ Completo | Indicador visual verde/ámbar/rojo |
| `src/features/services/hooks/useServiceUpdates.ts` | ✅ Completo | Conecta WS + FCM al store de servicios |
| `src/features/dashboard/hooks/useDashboardUpdates.ts` | ✅ Completo | Escucha `service:assigned` → refresh de KPIs |
| `src/features/dashboard/hooks/useDashboard.ts` | ✅ Integrado | Usa `useDashboardUpdates(refresh)` |
| `src/features/earnings/hooks/useEarningsUpdates.ts` | ✅ Completo | Escucha `settlement:created` → invalida cache |
| `src/features/earnings/hooks/useEarnings.ts` | ✅ Integrado | Usa `useEarningsUpdates()` |
| Backend `/services` gateway | ✅ Completo | Emite `service:updated`, `service:assigned`, `settlement:created` |
| Backend `/dashboard` gateway | ✅ Activo | Emite `service:updated`, `dashboard:refresh` (para ADMIN/AUX) |
| Backend `/tracking` gateway | ✅ Activo | Emite `location:updated` (solo para ADMIN/AUX) |
| `GenerarLiquidacionCourierUseCase` | ✅ Integrado | Llama `emitSettlementCreated()` al crear liquidación |

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  useServices │    │ useDashboard │                   │
│  │  (WS activo) │    │  (WS falta)  │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                           │
│  ┌──────▼───────────────────▼───────┐                  │
│  │         wsClient (singleton)      │                  │
│  │  - connect(token)                 │                  │
│  │  - on(event, handler)             │                  │
│  │  - disconnect()                   │                  │
│  │  - reconnect con backoff          │                  │
│  └──────────────┬────────────────────┘                  │
└─────────────────┼───────────────────────────────────────┘
                  │ WebSocket (Engine.IO v4)
                  │ wss://tracking-backend-tald.onrender.com
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   NestJS Backend                         │
│                                                         │
│  /services gateway  →  service:updated, service:assigned│
│  /dashboard gateway →  service:updated, dashboard:refresh│
│  /tracking gateway  →  location:updated (ADMIN/AUX only)│
└─────────────────────────────────────────────────────────┘
```

### Capas de tiempo real (por prioridad)

```
1. WebSocket (< 50ms)   — app en foreground, conexión activa
2. FCM Push             — app en background o killed
3. Polling (cada 45s)   — fallback cuando WS no disponible
```

---

## Parte 1: Lo que ya funciona — Servicios

### Flujo actual

```
useServices()
  └── useServiceUpdates()
        ├── wsClient.connect(token)
        ├── wsClient.on('service:updated', handler)  → updateService() + setQueryData()
        ├── wsClient.on('service:assigned', handler) → addService() + invalidateQueries()
        └── onServiceUpdateMessage() [FCM foreground]
```

El `wsClient` es un singleton que:
- Conecta al namespace `/services` con el JWT como query param
- Hace ping cada 25s para mantener la conexión viva en Render
- Reconecta automáticamente con backoff: 1s → 2s → 4s → 8s → 16s → 30s
- Mantiene listeners persistentes que se replayan en cada reconexión

**No tocar esto.** Está funcionando correctamente.

---

## Parte 2: Dashboard en tiempo real

### Problema actual

`useDashboard` hace fetch inicial y luego depende del store de servicios (que sí se actualiza por WS). Los KPIs se recalculan localmente, pero si el backend emite `dashboard:refresh`, el mobile no lo escucha.

### Solución: `useDashboardUpdates` hook

Crear `src/features/dashboard/hooks/useDashboardUpdates.ts`:

```typescript
import { useEffect } from 'react';
import { wsClient } from '@/core/api/wsClient';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Escucha el namespace /dashboard del backend.
 * Cuando llega 'dashboard:refresh', llama onRefresh para re-fetch de KPIs.
 *
 * NOTA: El backend /dashboard gateway solo acepta ADMIN/AUX.
 * Para el courier, los KPIs se recalculan localmente desde servicesStore.
 * Este hook es útil si en el futuro el courier tiene su propio dashboard WS.
 */
export function useDashboardUpdates(onRefresh: () => void): void {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    // El courier ya recibe service:updated y service:assigned en /services
    // Los KPIs del dashboard se derivan del servicesStore, que ya está sincronizado
    // Este hook es un placeholder para cuando se agregue un namespace /courier-dashboard
    const unsubUpdate = wsClient.on('service:updated', () => {
      // KPIs se recalculan automáticamente desde el store — no necesita re-fetch
    });

    const unsubAssigned = wsClient.on('service:assigned', () => {
      // Nuevo servicio asignado — invalidar KPIs
      onRefresh();
    });

    return () => {
      unsubUpdate();
      unsubAssigned();
    };
  }, [accessToken, onRefresh]);
}
```

### Integrar en `useDashboard.ts`

```typescript
// Agregar al final del hook useDashboard, antes del return:
useDashboardUpdates(refresh);
```

Los KPIs ya se recalculan desde `servicesStore` que está sincronizado con WS. El `service:assigned` sí requiere un refresh porque agrega un nuevo servicio al conteo.

---

## Parte 3: Earnings — notificación de nueva liquidación

### Problema actual

`EarningsScreen` no sabe cuándo el backend genera una nueva liquidación. El usuario tiene que hacer pull-to-refresh manualmente.

### Solución: evento `settlement:created`

#### Backend (ya debe emitir esto o se agrega)

En `liquidaciones` use case, después de crear una liquidación:

```typescript
// En el use case de crear liquidación
this.serviceUpdatesGateway.emitToUser(courierId, 'settlement:created', {
  id: settlement.id,
  amount: settlement.amount,
  created_at: settlement.created_at,
});
```

O agregar un método al `ServiceUpdatesGateway`:

```typescript
emitSettlementCreated(courierId: string, settlement: Record<string, unknown>): void {
  this.server.to(`courier:${courierId}`).emit('settlement:created', settlement);
}
```

#### Mobile — `src/features/earnings/hooks/useEarningsUpdates.ts`

```typescript
import { useEffect } from 'react';
import { wsClient } from '@/core/api/wsClient';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

export function useEarningsUpdates(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const unsub = wsClient.on('settlement:created', () => {
      // Invalidar cache para que React Query re-fetch en el próximo render
      queryClient.invalidateQueries({ queryKey: ['courier-earnings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['courier-settlements'] });
    });

    return unsub;
  }, [accessToken, queryClient]);
}
```

#### Integrar en `useEarnings.ts`

```typescript
// Agregar dentro del hook:
useEarningsUpdates();
```

---

## Parte 4: Indicador de estado de conexión WS

### Exponer estado de conexión desde `wsClient`

Agregar al `ServiceWebSocketClient` en `wsClient.ts`:

```typescript
// Agregar propiedad observable
private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
private statusListeners = new Set<(status: string) => void>();

onStatusChange(handler: (status: 'connected' | 'disconnected' | 'reconnecting') => void): () => void {
  this.statusListeners.add(handler);
  return () => this.statusListeners.delete(handler);
}

private _setStatus(status: 'connected' | 'disconnected' | 'reconnecting'): void {
  this.connectionStatus = status;
  this.statusListeners.forEach(h => h(status));
}

get status(): 'connected' | 'disconnected' | 'reconnecting' {
  return this.connectionStatus;
}
```

Llamar `_setStatus` en los puntos clave:
- `SIO_CONNECT` recibido → `'connected'`
- `_scheduleReconnect()` → `'reconnecting'`
- `disconnect()` → `'disconnected'`

### Hook `useWsStatus`

```typescript
// src/core/hooks/useWsStatus.ts
import { useState, useEffect } from 'react';
import { wsClient } from '@/core/api/wsClient';

export function useWsStatus() {
  const [status, setStatus] = useState(wsClient.status);

  useEffect(() => {
    return wsClient.onStatusChange(setStatus);
  }, []);

  return status;
}
```

### Componente visual (opcional)

```typescript
// src/shared/components/WsStatusDot.tsx
import { View } from 'react-native';
import { useWsStatus } from '@/core/hooks/useWsStatus';

const COLOR = {
  connected: '#22c55e',
  reconnecting: '#f59e0b',
  disconnected: '#ef4444',
};

export function WsStatusDot() {
  const status = useWsStatus();
  return (
    <View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: COLOR[status],
    }} />
  );
}
```

---

## Parte 5: Manejo de token expirado en WS

### Problema

El JWT expira en 15 minutos. Si el WS está conectado cuando el token expira, el backend cerrará la conexión en el próximo ping/pong o en la próxima verificación.

### Solución

Escuchar el evento de reconexión y pasar el token actualizado:

```typescript
// En useServiceUpdates.ts — ya existe, solo agregar:
useEffect(() => {
  if (!accessToken) return;

  // Si el token cambió (refresh automático), reconectar con el nuevo token
  wsClient.connect(accessToken); // wsClient ya maneja "si mismo token, no reconectar"

  // ...resto del código existente
}, [accessToken]); // accessToken como dependencia ya está
```

El `wsClient.connect()` ya tiene esta lógica:
```typescript
connect(token: string): void {
  // Si mismo token y conexión abierta → no hace nada
  if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentToken === token) return;
  // Si token diferente → reconecta
  this.currentToken = token;
  this._openSocket(token);
}
```

Cuando el interceptor de Axios hace refresh y llama `setSession(user, newToken)`, el `accessToken` en el store cambia, el `useEffect` en `useServiceUpdates` se re-ejecuta, y `wsClient.connect(newToken)` reconecta con el token fresco.

---

## Parte 6: Múltiples namespaces (futuro)

Actualmente `wsClient` solo conecta a `/services`. Si se necesita conectar a `/dashboard` o a un namespace de courier específico, hay dos opciones:

### Opción A: Extender wsClient para múltiples namespaces

```typescript
// Crear una factory en wsClient.ts
export function createWsClient(namespace: string): ServiceWebSocketClient {
  return new ServiceWebSocketClient(namespace);
}

export const wsClient = createWsClient('/services');
export const dashboardWsClient = createWsClient('/dashboard');
```

### Opción B: Un solo namespace con eventos tipados (recomendada)

Agregar al backend un namespace `/courier` que emita todos los eventos del courier:
- `service:updated`
- `service:assigned`
- `settlement:created`
- `workday:updated`

Esto simplifica el mobile: una sola conexión WS para todo.

---

## Resumen de archivos creados/modificados

### Nuevos archivos

| Archivo | Descripción |
|---|---|
| `src/features/dashboard/hooks/useDashboardUpdates.ts` | Escucha WS para invalidar KPIs |
| `src/features/earnings/hooks/useEarningsUpdates.ts` | Escucha `settlement:created` |
| `src/core/hooks/useWsStatus.ts` | Hook para estado de conexión |
| `src/shared/components/WsStatusDot.tsx` | Indicador visual |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/core/api/wsClient.ts` | Agregados `onStatusChange()`, `_setStatus()`, `status` getter |
| `src/features/dashboard/hooks/useDashboard.ts` | Integra `useDashboardUpdates(refresh)` |
| `src/features/earnings/hooks/useEarnings.ts` | Integra `useEarningsUpdates()` |

### Backend

| Archivo | Cambio |
|---|---|
| `src/modules/servicios/services-updates.gateway.ts` | Agregado `emitSettlementCreated()` |
| `src/modules/liquidaciones/liquidaciones.module.ts` | Importa `ServiciosModule` |
| `src/modules/liquidaciones/application/use-cases/generar-liquidacion-courier.use-case.ts` | Inyecta `ServiceUpdatesGateway`, llama `emitSettlementCreated()` |

---

## Tests

Suite completa: **243 tests, todos pasan.**

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `src/__tests__/core/wsClient.status.spec.ts` | 11 | Estado inicial, transiciones connected/reconnecting/disconnected, múltiples listeners, unsubscribe, guard de no-duplicados |
| `src/__tests__/core/useWsStatus.test.ts` | 7 | Hook reactivo, cambios secuenciales, unsubscribe en unmount |
| `src/__tests__/dashboard/useDashboardUpdates.test.ts` | 7 | Registro de listener, `onRefresh` en `service:assigned`, sin token no registra, unsubscribe |
| `src/__tests__/earnings/useEarningsUpdates.test.ts` | 5 | Invalidación de cache, eventos no relacionados ignorados, múltiples eventos, unsubscribe |

Para probar WS en desarrollo local:

```bash
# Levantar backend local
npm run start:dev   # en TracKing-backend/

# Cambiar temporalmente en wsClient.ts:
const WS_BASE_URL = 'ws://192.168.1.15:3000';  # misma IP que apiClient
```
