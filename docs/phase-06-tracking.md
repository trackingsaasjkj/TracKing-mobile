# Phase 06 — GPS Tracking & Mapa en Tiempo Real

## Overview

Reporta la posición GPS del mensajero al backend cada 15 segundos mientras tiene un servicio en estado `IN_TRANSIT`. El tracking corre en foreground y background. La posición se muestra en un mapa interactivo (WebView + Leaflet + Maptiler) tanto en la pantalla de detalle del servicio como en el tab dedicado de mapa.

---

## Arquitectura

```
index.ts
  └── import backgroundLocationTask   ← registra la task antes del árbol React

TrackingScreen (tab "Mapa")
  └── useLocation({ active: operationalStatus === 'IN_SERVICE' })
        ├── escribe coords → useTrackingStore (Zustand)
        ├── foreground: getCurrentPositionAsync cada 15s → locationApi.send()
        └── background: expo-task-manager task → locationApi.sendFromBackground()

ServiceDetailScreen
  └── useTrackingCoords()              ← solo lectura del store, sin segundo interval
        └── CourierServiceMap (origen + destino + courier)

TrackingScreen (cuando hay servicio activo con geocoords)
  └── CourierServiceMap fullScreen     ← mismo componente, modo pantalla completa
```

---

## API Endpoint

| Método | Ruta | Auth | Body |
|--------|------|------|------|
| POST | `/api/courier/location` | Bearer JWT (rol COURIER) | `{ latitude, longitude, accuracy? }` |

- `courier_id` se resuelve desde el JWT — nunca se envía en el body
- El backend valida que el mensajero esté en estado `IN_SERVICE`; retorna `400` si no
- El mobile activa el tracking cuando `operationalStatus === 'IN_SERVICE'`

---

## Reglas de negocio

- Ubicación enviada cada **15 segundos** (foreground interval + background task)
- Solo cuando `operationalStatus === 'IN_SERVICE'` (estado del mensajero, no del servicio)
- En respuesta `400`: detener todo el tracking (mensajero salió de `IN_SERVICE`)
- Errores de red se swallean silenciosamente — no deben interrumpir el flujo del mensajero
- Campo `accuracy` se **omite** si es `null` (nunca enviar `0` — significaría "precisión perfecta")
- La task de background lee el token directamente desde `SecureStore` (Zustand puede estar vacío en background profundo)

---

## Archivos

```
src/features/tracking/
├── api/
│   └── locationApi.ts              # send() para foreground, sendFromBackground() para background
├── components/
│   └── TrackingMap.tsx             # WebView + Leaflet, recibe coords como props
├── hooks/
│   └── useLocation.ts              # ciclo de vida del tracking + useTrackingCoords (read-only)
├── screens/
│   └── TrackingScreen.tsx          # tab dedicado al mapa, dueño del ciclo de tracking
├── store/
│   └── trackingStore.ts            # Zustand store compartido de coords GPS
└── tasks/
    └── backgroundLocationTask.ts   # expo-task-manager task, usa sendFromBackground()

src/config/
└── map.ts                          # MAPTILER_KEY desde process.env.EXPO_PUBLIC_MAPTILER_KEY
```

---

## Implementación del mapa — WebView + Leaflet + Maptiler

### Por qué WebView + Leaflet (no react-native-maps)

| | WebView + Leaflet | react-native-maps |
|---|---|---|
| Proveedor de tiles | Maptiler (CDN, free tier 100k/mes) | Google Maps (requiere billing) |
| API key requerida | Maptiler (gratuita) | Google Maps API key |
| Funciona en Expo Go | Sí | No (requiere dev build nativo) |
| Complejidad de setup | Baja | Alta (config nativa) |
| Actualización de marcador | `postMessage` sin reload | `setState` nativo |

### Por qué Maptiler en lugar de OSM directo

Los servidores de tiles de OpenStreetMap tienen políticas de uso que restringen apps comerciales con alto volumen. Maptiler usa los mismos datos OSM pero con CDN propio, free tier de 100k tiles/mes y tiers pagos predecibles para escalar.

### Cómo funciona

1. `useLocation` escribe coords en `useTrackingStore` en cada ciclo de 15s
2. `TrackingScreen` lee el store y pasa coords a `CourierServiceMap` (modo `fullScreen`)
3. `CourierServiceMap` construye el HTML de Leaflet **una sola vez** con `useMemo`
4. Actualizaciones de posición del courier se envían via `postMessage` → `marker.setLatLng()` + `map.panTo()` — sin reload del WebView
5. Los pins de origen y destino son estáticos (no cambian durante la entrega)

### Configuración de la API key

```ts
// src/config/map.ts — fuente única de verdad
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
```

```dotenv
# .env
EXPO_PUBLIC_MAPTILER_KEY=tu_key_aqui
```

La variable usa el prefijo `EXPO_PUBLIC_` para que Metro la incluya en el bundle del cliente.

---

## TrackingStore — store compartido de coords

```
Problema resuelto:
  useLocation se llama en TrackingScreen (siempre montado).
  ServiceDetailScreen también necesita las coords para CourierServiceMap.
  Sin store compartido → dos foreground intervals → doble envío al backend.

Solución:
  useLocation escribe en useTrackingStore.
  useTrackingCoords() (read-only) lee del store sin iniciar ningún interval.
  ServiceDetailScreen usa useTrackingCoords().
```

```typescript
// Solo TrackingScreen llama esto (inicia el tracking)
const { latitude, longitude, permissionDenied } = useLocation({ active: isInService });

// ServiceDetailScreen y cualquier otro componente usan esto (solo lectura)
const { latitude, longitude } = useTrackingCoords();
```

---

## TrackingScreen — lógica de renderizado

```
operationalStatus !== 'IN_SERVICE'  →  estado vacío "Sin ruta activa"
IN_SERVICE pero sin geocoords       →  aviso "Coordenadas no disponibles"
IN_SERVICE + geocoords disponibles  →  CourierServiceMap fullScreen
```

El componente lee el servicio activo (`ACCEPTED` o `IN_TRANSIT`) directamente del `useServicesStore` — sin fetch adicional, el store ya está hidratado por `useDashboard` / `useServices`.

---

## Background Task

La task (`backgroundLocationTask.ts`) corre via `expo-task-manager` aunque la app esté minimizada o la pantalla apagada.

**Estrategia de token:** lee directamente desde `expo-secure-store` via `secureStorage.getToken()` en lugar de Zustand. Garantiza disponibilidad del token aunque el proceso JS haya sido reiniciado por el OS.

```typescript
// locationApi.sendFromBackground() — usado por la task
const token = await secureStorage.getToken();
if (!token) return; // sin sesión — skip silencioso
await axios.post(`${BASE_URL}/api/courier/location`, payload, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Registro:** la task debe importarse en `index.ts` antes de `registerRootComponent`:

```typescript
import './src/features/tracking/tasks/backgroundLocationTask';
```

---

## Criterios de completitud

- [x] Permiso de ubicación solicitado antes de iniciar
- [x] Denegación de permiso muestra aviso no bloqueante en el mapa
- [x] Ubicación enviada cada 15s cuando el mensajero está `IN_SERVICE`
- [x] Task de background envía ubicación cuando la app está minimizada
- [x] Task de background lee token desde SecureStore (no Zustand)
- [x] `accuracy` omitido cuando es null (no enviado como 0)
- [x] Respuesta 400 detiene el interval de foreground y la task de background
- [x] Errores de red swallowed silenciosamente
- [x] Coords escritas en store compartido (sin doble interval)
- [x] `useTrackingCoords` para lectura sin iniciar tracking
- [x] `TrackingScreen` como tab dedicado al mapa
- [x] `CourierServiceMap` reutilizado en modo `fullScreen`
- [x] Maptiler como proveedor de tiles (CDN, free tier)
- [x] API key desde `process.env.EXPO_PUBLIC_MAPTILER_KEY`
- [x] `postMessage` para actualizar marcador sin reload del WebView
- [x] Estado vacío cuando no hay servicio activo
- [x] Aviso cuando el servicio no tiene geocoords
