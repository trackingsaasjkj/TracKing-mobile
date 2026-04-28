# Phase 11 — UX Improvements & Bug Fixes

## Resumen

Serie de mejoras de UX, correcciones de bugs y ajustes de consistencia visual realizados sobre la app mobile. Ningún cambio rompe contratos de API ni lógica de negocio existente.

---

## 1. Toggle de jornada — lógica de estados

### Problema
El toggle ON/OFF del dashboard solo reconocía `AVAILABLE` como estado activo. Si el mensajero tenía pedidos activos (`IN_SERVICE`), el toggle aparecía en OFF y el botón quedaba deshabilitado, impidiendo cualquier interacción.

### Solución
**Archivo:** `src/features/dashboard/components/Header.tsx`

- `isOn` ahora es `true` cuando el estado es `AVAILABLE` **o** `IN_SERVICE`
- El valor inicial de la animación usa `isOn` en lugar de `isAvailable`
- `isDisabled` solo bloquea durante loading — la lógica de "servicios activos" vive dentro de `handlePress` como alerta informativa, no como bloqueo del botón
- Eliminada variable `isUnavailable` que no se usaba

```ts
// Antes
const isAvailable = user?.operationalStatus === 'AVAILABLE';
const isDisabled = loading || (isAvailable && activeCount > 0);

// Después
const isOn = operationalStatus === 'AVAILABLE' || operationalStatus === 'IN_SERVICE';
const isDisabled = loading; // solo durante petición en vuelo
```

---

## 2. Estado operacional real al hacer login

### Problema
Al iniciar sesión, `useLogin` seteaba `operationalStatus: 'UNAVAILABLE'` hardcodeado, sin importar el estado real del mensajero en el backend. Si el mensajero tenía pedidos activos (`IN_SERVICE`), el toggle aparecía apagado hasta que `useDashboard` cargaba el perfil.

### Solución
**Archivo:** `src/features/auth/hooks/useLogin.ts`

Después del login exitoso, se hace un fetch a `/api/courier/me` para obtener el `operational_status` real y se actualiza la sesión con ese valor.

```ts
// Después del setSession inicial, se corrige con el estado real
try {
  const profile = await dashboardApi.getProfile();
  user.operationalStatus = profile.operational_status;
  setSession(user, userData.accessToken ?? '');
} catch {
  // Non-critical: useDashboard sincroniza en mount
}
```

---

## 3. Inicio de jornada desde IN_SERVICE

### Problema
Si el mensajero tenía pedidos activos de una sesión anterior, su estado era `IN_SERVICE`. Al tocar "iniciar jornada", el backend rechazaba con `400: No se puede iniciar jornada desde estado IN_SERVICE`.

### Solución
**Archivo:** `src/features/dashboard/components/Header.tsx`

El toggle ya muestra ON para `IN_SERVICE` (ver punto 1). Si el mensajero toca el toggle en ese estado, se trata como intento de finalizar jornada — se muestra el alert de "servicios activos" que bloquea correctamente.

> El fix complementario en el backend se documenta en la sección de backend.

---

## 4. Sección de servicios — eliminación de filtros por tabs

### Cambio
**Archivo:** `src/features/services/screens/ServicesScreen.tsx`

- Eliminados los tabs de filtro (Asignados / Aceptados / En Ruta)
- La lista ahora muestra **todos los servicios que no sean `DELIVERED`**
- El botón hamburguesa se movió al header (junto al título y badge de conteo)
- Menú hamburguesa contiene: **Completados** y **Historial**

```ts
// Antes: filtrado por tab activo
const filtered = services.filter((s) => TAB_STATUSES[activeTab].includes(s.status));

// Después: todos los no completados
const activeServices = services.filter((s) => s.status !== 'DELIVERED');
```

---

## 5. Vista de completados del día

### Cambio
**Archivo:** `src/features/services/screens/ServicesScreen.tsx`

- Opción "Completados" en el menú hamburguesa actúa como toggle
- Al activarse, muestra solo los servicios `DELIVERED` del día
- Header cambia a layout con botón "‹ Pedidos" a la izquierda y título "Completados" centrado (consistente con la pantalla de Historial)
- Al desactivarse, vuelve a la vista normal de pedidos activos

---

## 6. Botón de volver en Historial

### Cambio
**Archivo:** `src/features/services/screens/ServiceHistoryScreen.tsx`

La pantalla de historial tenía `headerShown: false` y no tenía botón de volver. Se agregó un botón "‹ Pedidos" en la esquina izquierda del header.

---

## 7. Botón de jornada — único punto de control

### Cambio
**Archivos:** `src/features/workday/screens/WorkdayScreen.tsx`

- Eliminados los botones "Iniciar jornada" / "Finalizar jornada" de la pantalla Config
- El toggle del dashboard es ahora el **único** control de jornada
- La pantalla Config conserva: perfil del usuario, badge de estado (ahora reconoce `IN_SERVICE` → "En servicio"), toggle de modo oscuro, configuración de ciudad del mapa, y botón de cerrar sesión
- Eliminadas importaciones de `useWorkday` y `useServicesStore` de `WorkdayScreen`

---

## 8. Paleta de colores — alineación con frontend

### Cambio
**Archivos:** `src/shared/ui/colors.ts`, `src/shared/ui/darkColors.ts`

El color primario cambió de verde a azul para alinearse con el frontend web (`TracKing-frontend`).

| Token | Antes | Después |
|-------|-------|---------|
| `primary` | `#1A6B3C` (verde) | `#1D4ED8` (azul — frontend `primary.DEFAULT`) |
| `primaryLight` | `#4CAF7D` | `#60A5FA` (frontend `primary.light`) |
| `primaryDark` | `#145530` | `#1E40AF` |
| `primaryBg` | `#E8F5EE` | `#EFF6FF` (frontend `primary.pale`) |

Dark mode:

| Token | Antes | Después |
|-------|-------|---------|
| `primary` | `#4CAF7D` | `#60A5FA` |
| `primaryLight` | `#A8E6C3` | `#93C5FD` (frontend `accent`) |
| `primaryBg` | `#0D2B1A` | `#0D1B3E` |
| `background` | `#0B121E` | `#0A0F1E` |

---

## 9. Etiquetas del menú inferior — español

### Cambio
**Archivo:** `src/app/navigation/TabNavigator.tsx`

| Tab | Antes | Después |
|-----|-------|---------|
| Home | Home | Inicio |
| Orders | Orders | Servicios |
| Tracking | Mapa | Mapa (sin cambio) |
| Earnings | Earnings | Reportes |
| Config | Config | Configuración |

---

## 10. Firebase — compatibilidad con Expo Go

### Cambio
**Archivos:** `src/core/notifications/fcm.service.ts`, `app.json`

- `@react-native-firebase/app` y `@react-native-firebase/messaging` removidos de los plugins de `app.json` (solo necesarios en builds nativas)
- `fcm.service.ts` detecta Expo Go con `Constants.appOwnership === 'expo'` y usa stubs no-op en ese entorno
- Firebase se carga con `require()` lazy para evitar que el módulo se evalúe en Expo Go

```ts
const IS_EXPO_GO = Constants.appOwnership === 'expo';

export async function getFCMToken(): Promise<string | null> {
  if (IS_EXPO_GO) return null; // no-op en Expo Go
  // ...lógica real con Firebase
}
```

> Para builds nativas (`expo run:android`), agregar de nuevo los plugins al `app.json`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/features/dashboard/components/Header.tsx` | Toggle reconoce IN_SERVICE, isDisabled simplificado |
| `src/features/auth/hooks/useLogin.ts` | Fetch de perfil post-login para estado real |
| `src/features/services/screens/ServicesScreen.tsx` | Sin tabs, hamburguesa en header, vista completados |
| `src/features/services/screens/ServiceHistoryScreen.tsx` | Botón "‹ Pedidos" en header |
| `src/features/workday/screens/WorkdayScreen.tsx` | Eliminados botones de jornada, badge IN_SERVICE |
| `src/shared/ui/colors.ts` | Paleta azul alineada con frontend |
| `src/shared/ui/darkColors.ts` | Paleta dark azul alineada con frontend |
| `src/app/navigation/TabNavigator.tsx` | Etiquetas en español |
| `src/core/notifications/fcm.service.ts` | Mock para Expo Go |
| `app.json` | Plugins Firebase removidos (Expo Go compat) |
| `src/core/api/apiClient.ts` | BASE_URL corregida (`http://IP:PORT`) |
