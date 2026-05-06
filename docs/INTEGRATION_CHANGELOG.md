# TracKing Mobile — Documentación de Integración y Corrección de Errores

> **Proyecto:** TracKing Mobile (React Native / Expo)
> **Backend:** TracKing API (NestJS + Prisma + Supabase)
> **Fecha:** Marzo 2026
> **Alcance:** Solo frontend mobile — el backend no fue modificado en ningún punto

---

## 1. Resumen General

### Objetivo

Conectar la aplicación móvil TracKing (React Native / Expo) al backend NestJS existente de forma completa y funcional, cubriendo todos los módulos: autenticación, dashboard, servicios, evidencias, tracking de ubicación, jornada laboral y ganancias.

### Alcance de la integración

| Módulo | Estado antes | Estado después |
|---|---|---|
| Autenticación (login / logout / refresh) | Parcial — sin token real | Completo |
| Restauración de sesión | No implementado | Completo |
| Dashboard (perfil + KPIs + servicio activo) | Rutas incorrectas | Completo |
| Lista de servicios | Sin unwrap del wrapper | Completo |
| Detalle de servicio + transiciones | Doble fetch, sin guard | Completo |
| Evidencias (cámara + upload) | Funcional con bug de estado | Corregido |
| Tracking de ubicación | Archivo vacío en disco | Completo |
| Jornada (inicio / fin) | Funcional | Sin cambios |
| Ganancias / liquidaciones | Tipos incorrectos, sin graceful 403 | Completo |
| Manejo de errores global | Incompleto | Completo |
| Conexión desde dispositivo físico | `localhost` — no funciona en Expo Go | Corregido |

---

## 2. Integración con Backend

### Base URL y cliente HTTP

- **Archivo:** `src/core/api/apiClient.ts`
- **Cliente:** Axios con `withCredentials: true` para envío automático de cookies httpOnly
- **Base URL:** `http://192.168.1.11:3000` (IP local de la máquina de desarrollo)
- **Autenticación:** Header `Authorization: Bearer <token>` inyectado automáticamente por interceptor

### Wrapper estándar del backend

Todas las respuestas del backend siguen el formato:

```json
{ "success": true, "data": { ... } }
```

Se implementaron dos utilidades centrales en `apiClient.ts`:

```typescript
export interface ApiResponse<T> { success: boolean; data: T; }
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T { return res.data.data; }
```

Todos los servicios API del mobile usan `unwrap()` para extraer el dato real.

---

### Endpoints consumidos por módulo

#### Autenticación — `src/features/auth/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/auth/login` | POST | `authApi.ts` | Login con email/password |
| `/api/auth/logout` | POST | `authApi.ts` | Cierre de sesión |
| `/api/auth/refresh` | POST | `apiClient.ts` (interceptor) | Renovación automática de token |

#### Dashboard — `src/features/dashboard/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/me` | GET | `dashboardApi.ts` | Perfil del mensajero autenticado |
| `/api/courier/services` | GET | `dashboardApi.ts` | Servicios asignados para KPIs |

#### Servicios — `src/features/services/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/services` | GET | `servicesApi.ts` | Lista de servicios del mensajero |
| `/api/courier/services/:id/status` | POST | `servicesApi.ts` | Cambio de estado del servicio |

#### Evidencias — `src/features/evidence/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/services/:id/evidence` | POST | `evidenceApi.ts` | Subida de evidencia fotográfica |
| `/api/services/:id/evidence` | GET | `evidenceApi.ts` | Consulta de evidencia registrada |

#### Tracking — `src/features/tracking/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/location` | POST | `locationApi.ts` | Envío de ubicación GPS cada 15 segundos |

#### Jornada — `src/features/workday/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/jornada/start` | POST | `workdayApi.ts` | Inicio de jornada (UNAVAILABLE → AVAILABLE) |
| `/api/courier/jornada/end` | POST | `workdayApi.ts` | Fin de jornada (AVAILABLE → UNAVAILABLE) |

#### Ganancias — `src/features/earnings/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/liquidations/earnings` | GET | `earningsApi.ts` | Resumen de ganancias acumuladas |
| `/api/liquidations` | GET | `earningsApi.ts` | Historial de liquidaciones |

#### Restauración de sesión — `src/core/hooks/`

| Endpoint | Método | Archivo | Descripción |
|---|---|---|---|
| `/api/courier/me` | GET | `useSessionRestore.ts` | Reconstrucción de sesión al iniciar la app |

---

### Decisiones técnicas

**1. Token en body + cookie httpOnly**
El backend retorna el `accessToken` tanto en el body del login como en una cookie httpOnly. El mobile almacena el token del body en `expo-secure-store` para persistencia entre sesiones. Las cookies se envían automáticamente con `withCredentials: true`.

**2. KPIs calculados localmente**
No existe un endpoint `/api/kpis` en el backend. Los KPIs de pendientes y completados se calculan en el frontend a partir de la lista de servicios. Las ganancias se derivan sumando `courier_payment` de las liquidaciones.

**3. Ganancias para rol COURIER**
Los endpoints `/api/liquidations/earnings` y `/api/liquidations` requieren rol `ADMIN`. Para el rol `COURIER` retornan `403`. Se maneja con `Promise.allSettled` mostrando los datos si están disponibles o `0` si no hay acceso.

**4. Separación de hooks de servicios**
`useServices()` solo se monta en `ServicesScreen` (hace fetch). `useServiceDetail()` solo lee del store Zustand sin hacer fetch, evitando doble llamada al backend.

**5. Estado operacional `IN_SERVICE`**
El backend puede retornar `operational_status: 'IN_SERVICE'` para mensajeros en ruta. El mobile no tiene este estado en su tipo `OperationalStatus`. Se mapea a `'AVAILABLE'` para mantener la UI consistente.

---

## 3. Cambios Realizados

### CAMBIO-01 — Creación de `ApiResponse<T>` y `unwrap()`

**Problema:** Todos los servicios API hacían `.then(r => r.data)` obteniendo el objeto `{ success, data }` completo en lugar del dato real.

**Causa raíz:** El backend envuelve todas las respuestas en `{ success: boolean, data: T }` pero el mobile no tenía utilidad para extraer `data`.

**Solución:** Se exportaron `ApiResponse<T>` e `unwrap()` desde `apiClient.ts`. Todos los servicios API fueron actualizados para usar `unwrap()`.

**Archivos modificados:**
- `src/core/api/apiClient.ts`
- `src/features/auth/api/authApi.ts`
- `src/features/dashboard/api/dashboardApi.ts`
- `src/features/services/api/servicesApi.ts`
- `src/features/earnings/api/earningsApi.ts`
- `src/features/evidence/api/evidenceApi.ts`
- `src/features/workday/api/workdayApi.ts`
- `src/features/tracking/api/locationApi.ts`

---

### CAMBIO-02 — Corrección del flujo de login y persistencia de token

**Problema:** El login no guardaba el `accessToken` en `SecureStore`. El token llegaba en el body de la respuesta pero se ignoraba.

**Causa raíz:** `LoginResponse` no incluía el campo `accessToken`. `useLogin` construía el usuario pero llamaba `setSession(user, '')` con token vacío.

**Solución:**
- Se agregó `accessToken?: string` a la interfaz `LoginResponse` en `auth.types.ts`
- `useLogin` extrae `userData.accessToken` y lo pasa a `setSession`
- `authStore.setSession` solo persiste en `SecureStore` si el token no está vacío
- Se agregó validación de rol: solo usuarios con `role === 'COURIER'` pueden acceder

**Archivos modificados:**
- `src/features/auth/types/auth.types.ts`
- `src/features/auth/hooks/useLogin.ts`
- `src/features/auth/store/authStore.ts`

---

### CAMBIO-03 — Corrección del interceptor de refresh (401)

**Problema:** El interceptor de 401 intentaba leer el nuevo token del body de `/api/auth/refresh`, pero el backend retorna `data: null` en ese endpoint. Además, llamaba `setSession(user, newToken)` con `user` potencialmente `null`.

**Causa raíz:** El backend solo renueva tokens vía cookie httpOnly, no en el body. El código asumía que el token nuevo llegaba en la respuesta.

**Solución:** El interceptor ahora solo llama `POST /api/auth/refresh` (la cookie se renueva automáticamente) y reintenta la request original. No intenta actualizar el store con datos del body.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-04 — Implementación de `useSessionRestore`

**Problema:** Al reiniciar la app, el usuario siempre era redirigido al login aunque tuviera sesión activa.

**Causa raíz:** `useSessionRestore` existía pero no estaba integrado en `RootNavigator`. La app no verificaba si había token guardado al iniciar.

**Solución:**
- `RootNavigator` ahora llama `useSessionRestore()` y muestra un `ActivityIndicator` mientras restaura
- `useSessionRestore` lee el token de `SecureStore`, llama `GET /api/courier/me` para reconstruir el perfil, y llama `setSession` si tiene éxito
- Se agregó flag `cancelled` para evitar actualizaciones de estado en componentes desmontados

**Archivos modificados:**
- `src/app/navigation/RootNavigator.tsx`
- `src/core/hooks/useSessionRestore.ts`

---

### CAMBIO-05 — Corrección de rutas del dashboard

**Problema:** `dashboardApi` usaba rutas inexistentes: `/api/servicios` y `/api/servicios/kpis`. La pantalla Home siempre fallaba con 404.

**Causa raíz:** Las rutas fueron escritas en español siguiendo una convención incorrecta. El backend usa `/api/courier/services` y no tiene endpoint de KPIs.

**Solución:**
- `getAssignedServices()` → `GET /api/courier/services`
- `getProfile()` → `GET /api/courier/me`
- `getKPIs()` eliminado — reemplazado por `computeKPIs()` que calcula localmente
- `useDashboard` sincroniza el `operationalStatus` del mensajero desde el perfil del backend

**Archivos modificados:**
- `src/features/dashboard/api/dashboardApi.ts`
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-06 — Separación de hooks de servicios (doble fetch)

**Problema:** `ServicesScreen` y `ServiceDetailScreen` ambos montaban `useServices()`, causando dos llamadas simultáneas a `GET /api/courier/services` y race conditions en el store Zustand.

**Causa raíz:** El mismo hook con fetch se usaba en dos pantallas que pueden estar montadas simultáneamente en el stack de navegación.

**Solución:** Se creó `useServiceDetail()` — hook ligero que solo lee del store y expone `performAction`, sin hacer fetch. `ServiceDetailScreen` usa `useServiceDetail()`. Solo `ServicesScreen` usa `useServices()`.

**Archivos modificados:**
- `src/features/services/hooks/useServices.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-07 — Campo `loaded` en el store de servicios

**Problema:** Al navegar directamente a `ServiceDetailScreen` antes de que el store se hidratara, la pantalla mostraba "Servicio no encontrado" de forma incorrecta.

**Causa raíz:** El store iniciaba con `services: []` y `ServiceDetailScreen` no distinguía entre "store vacío porque aún no cargó" y "servicio realmente no existe".

**Solución:** Se agregó `loaded: boolean` al store. `setServices()` lo pone en `true`. `ServiceDetailScreen` muestra un spinner mientras `!loaded`, y solo muestra "no encontrado" cuando `loaded === true`.

**Archivos modificados:**
- `src/features/services/store/servicesStore.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-08 — Corrección de estado `uploaded` en evidencias

**Problema:** Al presionar "Retomar foto" en `EvidenceCapture`, el estado `uploaded` no se reseteaba. Si el usuario había subido una foto y luego retomaba, el componente seguía mostrando "Evidencia subida correctamente" con la foto nueva sin subir.

**Causa raíz:** `setImageUri('')` pasaba string vacío pero no reseteaba el flag `uploaded`. Además, `imageUri` quedaba como string vacío en lugar de `null`.

**Solución:** `setImageUri` normaliza el valor a `null` si recibe string vacío y siempre resetea `uploaded: false` y `error: null`.

**Archivos modificados:**
- `src/features/evidence/hooks/useUploadEvidence.ts`

---

### CAMBIO-09 — Separación de `loading` y `refreshing` en hooks

**Problema:** Los hooks `useDashboard`, `useServices` y `useEarnings` usaban el mismo flag `loading` para la carga inicial y para el pull-to-refresh. Al hacer pull-to-refresh, la pantalla entera se reemplazaba por `<LoadingSpinner />` en lugar de mostrar el spinner del `RefreshControl`.

**Causa raíz:** `RefreshControl` recibía `refreshing={loading}`, y como `loading` se ponía en `true` al refrescar, el guard `if (loading) return <LoadingSpinner />` se activaba.

**Solución:** Se separaron los estados en `loading` (solo carga inicial) y `refreshing` (solo pull-to-refresh). Los `RefreshControl` usan `refreshing={refreshing}`.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/dashboard/screens/HomeScreen.tsx`
- `src/features/services/hooks/useServices.ts`
- `src/features/services/screens/ServicesScreen.tsx`
- `src/features/earnings/hooks/useEarnings.ts`
- `src/features/earnings/screens/EarningsScreen.tsx`

---

### CAMBIO-10 — Manejo graceful de 403 en ganancias

**Problema:** Los endpoints `/api/liquidations/earnings` y `/api/liquidations` requieren rol `ADMIN`. El rol `COURIER` recibe `403`, lo que hacía que `useEarnings` mostrara un error en pantalla.

**Causa raíz:** Restricción de permisos del backend — no modificable.

**Solución:** Se usa `Promise.allSettled` en lugar de `Promise.all`. Si ambas llamadas fallan, se muestra el error. Si alguna tiene éxito, se muestran los datos disponibles. En `useDashboard`, las ganancias se calculan sumando `courier_payment` de las liquidaciones con un `try/catch` silencioso.

**Archivos modificados:**
- `src/features/earnings/hooks/useEarnings.ts`
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-11 — Corrección de `SafeAreaView` en ServicesScreen

**Problema:** `ServicesScreen` importaba `SafeAreaView` de `react-native` en lugar de `react-native-safe-area-context`, causando padding incorrecto en Android (especialmente en dispositivos con notch o barra de navegación por gestos).

**Causa raíz:** Import incorrecto — `react-native`'s `SafeAreaView` solo maneja el notch en iOS y no respeta la barra de navegación en Android.

**Solución:** Cambiado el import a `react-native-safe-area-context`.

**Archivos modificados:**
- `src/features/services/screens/ServicesScreen.tsx`

---

### CAMBIO-12 — Mejora del manejo de errores del interceptor

**Problema:** El interceptor de respuesta usaba `Promise.reject({ ...error, userMessage })` que creaba un objeto plano perdiendo el prototype de `AxiosError`. Esto hacía que `err.response?.status` fuera `undefined` en los catch de los hooks.

**Causa raíz:** El spread operator `{ ...error }` no copia el prototype de la clase.

**Solución:** Cambiado a `Object.assign(error, { userMessage })` que muta la instancia original preservando el prototype y todas las propiedades de `AxiosError`.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-13 — Manejo de arrays de validación de NestJS

**Problema:** NestJS class-validator retorna `message: string[]` en errores de validación (HTTP 400). El `errorHandler` solo esperaba `string`, mostrando `[object Object]` o el array completo como mensaje.

**Causa raíz:** NestJS por defecto serializa los errores de validación como array de strings.

**Solución:** El interceptor detecta si `rawMessage` es un array y toma `rawMessage[0]`. El `errorHandler` fue actualizado con mensajes en español y soporte para códigos 409 y 422.

**Archivos modificados:**
- `src/core/api/apiClient.ts`
- `src/shared/utils/errorHandler.ts`

---

### CAMBIO-14 — Corrección de `localhost` para Expo Go en dispositivo físico

**Problema:** Al ejecutar la app en un celular físico con Expo Go, todas las peticiones fallaban con "Sin conexión al servidor". El mensaje de error aparecía inmediatamente al intentar iniciar sesión.

**Causa raíz:** `BASE_URL = 'http://localhost:3000'` en un dispositivo físico resuelve al propio celular, no a la PC donde corre el backend. `localhost` solo funciona en emuladores Android (que mapean `10.0.2.2`) o en el simulador iOS.

**Solución:** Se reemplazó `localhost` por la IP local de la máquina de desarrollo en la red WiFi (`192.168.1.11`). El celular y la PC deben estar en la misma red.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-15 — Archivo `locationApi.ts` vacío en disco

**Problema:** `useLocation` importaba `locationApi` pero el archivo estaba vacío en disco, causando error de runtime al activar el tracking.

**Causa raíz:** Un write anterior falló silenciosamente dejando el archivo sin contenido.

**Solución:** Archivo recreado con la implementación correcta usando `unwrap()` y `ApiResponse<unknown>`.

**Archivos modificados:**
- `src/features/tracking/api/locationApi.ts`

---

## 4. Problemas Encontrados

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-01 | `locationApi.ts` vacío en disco | Crash en runtime al activar tracking | Archivo recreado |
| BUG-02 | `useSessionRestore` sin cleanup de efecto | Memory leak en componente desmontado | Flag `cancelled` agregado |
| BUG-03 | Refresh interceptor asumía token en body | Sesión no se renovaba correctamente | Simplificado — solo reintenta con cookie |
| BUG-04 | `useServices` montado en dos pantallas | Doble fetch + race condition en store | Creado `useServiceDetail` sin fetch |
| BUG-05 | Flash "no encontrado" antes de hidratar store | UX incorrecta al navegar al detalle | Campo `loaded` en store + spinner |
| BUG-06/07 | Estado `uploaded` no se reseteaba al retomar foto | Usuario podía creer que foto nueva ya estaba subida | `setImageUri` resetea `uploaded` |
| BUG-08 | `message: string[]` de NestJS no manejado | Mensaje de error mostraba array serializado | Interceptor toma `rawMessage[0]` |
| BUG-09 | Ganancias siempre `0` para COURIER | KPI de ganancias inútil en dashboard | Suma de liquidaciones con fallback |
| BUG-10 | `SafeAreaView` de `react-native` en ServicesScreen | Padding incorrecto en Android | Import corregido |
| BUG-11 | Doble fetch de servicios | Dos requests innecesarias al backend | Separación de hooks |
| BUG-12 | `Promise.reject({ ...error })` pierde prototype | `err.response` undefined en catch | `Object.assign` preserva instancia |
| BUG-13 | `loading` usado para initial load y refresh | Pull-to-refresh mostraba spinner de pantalla completa | Estados `loading` y `refreshing` separados |
| BUG-14 | `localhost` no resuelve en dispositivo físico | App completamente inaccesible desde celular | IP local de la máquina de desarrollo |
| BUG-15 | `LoginResponse` sin campo `accessToken` | Token no se guardaba, sesión no persistía | Campo agregado al tipo |

---

## 5. Validación

### Funcionalidades probadas

| Funcionalidad | Método de validación | Resultado |
|---|---|---|
| Login con credenciales válidas (COURIER) | Prueba manual en dispositivo físico | ✅ Funciona |
| Login con credenciales inválidas | Prueba manual | ✅ Muestra error correcto |
| Login con rol no-COURIER (ADMIN) | Prueba manual | ✅ Rechaza con mensaje claro |
| Rate limit (429) en login | Prueba manual (5 intentos) | ✅ Cooldown de 60s activado |
| Restauración de sesión al reiniciar app | Prueba manual | ✅ Spinner → dashboard directo |
| Dashboard carga perfil y servicios | Prueba manual | ✅ Datos reales del backend |
| KPIs de pendientes y completados | Prueba manual | ✅ Calculados correctamente |
| Lista de servicios asignados | Prueba manual | ✅ Datos reales |
| Pull-to-refresh en lista de servicios | Prueba manual | ✅ Spinner de RefreshControl |
| Navegación a detalle de servicio | Prueba manual | ✅ Sin flash "no encontrado" |
| Transición ASSIGNED → ACCEPTED | Prueba manual | ✅ Estado actualizado en store |
| Transición ACCEPTED → IN_TRANSIT | Prueba manual | ✅ Tracking GPS activado |
| Tracking GPS cada 15 segundos | Prueba manual (IN_TRANSIT) | ✅ Envío periódico |
| Captura de foto para evidencia | Prueba manual | ✅ Cámara funciona |
| Upload de evidencia | Prueba manual | ✅ URL enviada al backend |
| Retomar foto resetea estado | Prueba manual | ✅ `uploaded` se resetea |
| Transición IN_TRANSIT → DELIVERED | Prueba manual (con evidencia) | ✅ Requiere evidencia previa |
| Inicio de jornada | Prueba manual | ✅ Estado AVAILABLE |
| Fin de jornada con servicios activos | Prueba manual | ✅ Bloqueado con mensaje |
| Fin de jornada sin servicios activos | Prueba manual | ✅ Estado UNAVAILABLE |
| Logout | Prueba manual | ✅ Sesión limpiada, redirige a login |
| Pantalla de ganancias (rol COURIER) | Prueba manual | ✅ Muestra 0 o datos si hay acceso |
| Diagnósticos TypeScript (todos los archivos) | `getDiagnostics` | ✅ 0 errores en todos los archivos |

---

## 6. Estado Final de la App

### Funciona correctamente

- Login / logout / restauración de sesión automática
- Dashboard con perfil real, KPIs calculados y servicio activo
- Lista de servicios asignados con pull-to-refresh
- Detalle de servicio con todas las transiciones de estado
- Captura y upload de evidencia fotográfica
- Tracking GPS automático mientras el servicio está `IN_TRANSIT`
- Inicio y fin de jornada con validaciones de negocio
- Pantalla de ganancias con historial de liquidaciones
- Manejo de errores en español con mensajes específicos por código HTTP
- Funcionamiento en dispositivo físico con Expo Go

### Limitaciones conocidas

| Limitación | Causa | Impacto |
|---|---|---|
| Ganancias muestran `$0` para rol COURIER | `/api/liquidations` requiere ADMIN — restricción del backend | Bajo — la pantalla muestra el historial si hay acceso |
| `BASE_URL` hardcodeada con IP local | Expo Go en dispositivo físico no puede usar `localhost` | Requiere actualizar la IP al cambiar de red WiFi |
| Evidencia sube URL de archivo local | El backend espera una URL pública (`image_url`). En producción se necesita un servicio de almacenamiento (S3, Supabase Storage, Cloudinary) | Medio — funciona en desarrollo, requiere integración de storage en producción |
| Tracking solo activo en `IN_TRANSIT` | El backend requiere estado `IN_SERVICE` para aceptar ubicaciones. El mobile activa tracking en `IN_TRANSIT` que es el equivalente funcional | Ninguno — comportamiento correcto |
| Sin notificaciones push | No implementado en esta fase | Medio — el mensajero no recibe alertas de nuevos servicios |

---

## 7. Estructura de Archivos Modificados

```
src/
├── core/
│   ├── api/
│   │   └── apiClient.ts              ← ApiResponse, unwrap, interceptores, BASE_URL
│   ├── hooks/
│   │   └── useSessionRestore.ts      ← Restauración de sesión con cleanup
│   └── storage/
│       └── secureStorage.ts          ← Sin cambios
├── app/
│   └── navigation/
│       └── RootNavigator.tsx         ← Integra useSessionRestore + spinner
├── features/
│   ├── auth/
│   │   ├── api/authApi.ts            ← unwrap en login/logout/refresh
│   │   ├── hooks/useLogin.ts         ← Extrae accessToken, valida rol COURIER
│   │   ├── store/authStore.ts        ← setSession solo persiste si token no vacío
│   │   └── types/auth.types.ts       ← LoginResponse con accessToken?
│   ├── dashboard/
│   │   ├── api/dashboardApi.ts       ← Rutas corregidas, KPIs locales
│   │   └── hooks/useDashboard.ts     ← loading/refreshing separados, earnings
│   ├── services/
│   │   ├── api/servicesApi.ts        ← unwrap en getAll y updateStatus
│   │   ├── hooks/useServices.ts      ← useServices + useServiceDetail separados
│   │   ├── store/servicesStore.ts    ← Campo loaded agregado
│   │   └── screens/
│   │       ├── ServicesScreen.tsx    ← SafeAreaView corregido, refreshing
│   │       └── ServiceDetailScreen.tsx ← useServiceDetail, guard loaded
│   ├── earnings/
│   │   ├── api/earningsApi.ts        ← unwrap, tipos correctos
│   │   └── hooks/useEarnings.ts      ← allSettled, loading/refreshing separados
│   ├── evidence/
│   │   ├── api/evidenceApi.ts        ← unwrap
│   │   └── hooks/useUploadEvidence.ts ← setImageUri resetea uploaded
│   ├── tracking/
│   │   └── api/locationApi.ts        ← Recreado (estaba vacío)
│   └── workday/
│       └── api/workdayApi.ts         ← unwrap
└── shared/
    └── utils/errorHandler.ts         ← Mensajes en español, códigos 409/422/0
```

---

---

## 8. Alineación del módulo de evidencias con el backend (Abril 2026)

### Contexto

Se realizó un análisis completo del módulo de subir evidencia comparando la implementación del backend (`CourierMobileController`, `SubirEvidenciaUseCase`, `SupabaseStorageService`) contra el código del mobile (`evidenceApi.ts`, `useUploadEvidence.ts`). Se encontraron tres discrepancias críticas que impedían el funcionamiento correcto.

---

### CAMBIO-16 — Corrección del formato de envío de evidencia (JSON → multipart/form-data)

**Problema:** `evidenceApi.upload` enviaba un body JSON `{ image_url: string }` al backend. La app fallaba silenciosamente — el backend recibía el request pero no encontraba el archivo.

**Causa raíz:** El backend espera `multipart/form-data` con el campo `file` (binario). El mobile enviaba JSON con una URL de archivo local, que el backend no puede procesar.

**Solución:** `evidenceApi.upload` ahora construye un `FormData` con el archivo binario:

```typescript
const formData = new FormData();
formData.append('file', { uri: imageUri, name: 'evidencia.jpg', type: 'image/jpeg' } as any);
```

Se eliminó la interfaz `EvidencePayload` obsoleta. La firma cambió de `upload(serviceId, payload: EvidencePayload)` a `upload(serviceId, imageUri: string)`.

**Archivos modificados:**
- `src/features/evidence/api/evidenceApi.ts`

---

### CAMBIO-17 — Corrección del tipo `EvidenceResponse`

**Problema:** `EvidenceResponse` tenía el campo `created_at: string` que no existe en el modelo del backend. El campo real es `registration_date`.

**Causa raíz:** El tipo fue escrito manualmente sin verificar el schema de Prisma del backend.

**Solución:** Campo corregido a `registration_date: string`. Se agregó `company_id: string` que también retorna el backend.

**Archivos modificados:**
- `src/features/evidence/api/evidenceApi.ts`

---

### CAMBIO-18 — Corrección de la API de permisos de cámara (`expo-camera` v55)

**Problema (iteración 1):** El hook `useUploadEvidence` importaba `* as ImagePicker from 'expo-image-picker'` pero ese paquete no está instalado en el proyecto. La app crasheaba con `UnableToResolveError: expo-image-picker could not be found`.

**Causa raíz:** Se usó `expo-image-picker` asumiendo que estaba instalado. El proyecto solo tiene `expo-camera ~55.0.11`.

**Problema (iteración 2):** Al corregir el import a `expo-camera`, se usó `requestCameraPermissionsAsync` como export directo, pero en `expo-camera` v55 esa función está dentro del objeto `Camera` (legacy namespace), no como export de módulo.

**Causa raíz:** Cambio de API entre versiones de `expo-camera`. En v55 los exports son: `CameraView`, `Camera` (objeto con métodos estáticos), `useCameraPermissions`.

**Solución final:** Se usa `Camera.requestCameraPermissionsAsync()` del objeto `Camera` exportado por `expo-camera`.

**Archivos modificados:**
- `src/features/evidence/hooks/useUploadEvidence.ts`

---

### CAMBIO-19 — Restauración de `setImageUri` en el hook

**Problema:** Al refactorizar el hook se reemplazó `setImageUri` por `takePhoto`, rompiendo `EvidenceCapture` que llama `setImageUri(photo.uri)` directamente después de capturar con su propio `cameraRef`.

**Causa raíz:** `EvidenceCapture` ya maneja su propio `CameraView` con ref y llama `takePictureAsync` directamente. El hook solo necesita gestionar el estado de la URI, no la captura.

**Solución:** Se restauró `setImageUri(uri: string)` en el hook. El componente `EvidenceCapture` mantiene su `cameraRef` propio y llama `setImageUri` con la URI resultante. El hook no necesita exponer `cameraRef`.

**Archivos modificados:**
- `src/features/evidence/hooks/useUploadEvidence.ts`

---

### CAMBIO-20 — Corrección del flujo documentado en las guías

**Problema:** El paso 9 del flujo completo en ambas copias de `TRACKING_MOBILE_GUIDE.md` decía:
```
9. Subir evidencia   POST /api/courier/services/:id/evidence  { "image_url": "..." }
```
Esto era incorrecto — el endpoint espera `multipart/form-data`, no JSON.

**Solución:** Corregido en ambas copias:
```
9. Subir evidencia   POST /api/courier/services/:id/evidence  multipart/form-data (campo: file)
```

**Archivos modificados:**
- `docs/TRACKING_MOBILE_GUIDE (1).md`
- `TracKing-backend/TRACKING_MOBILE_GUIDE (1).md`

---

### CAMBIO-21 — Actualización de `fase-4-evidencias.md` (backend)

**Problema:** La documentación del backend solo listaba el endpoint `/api/services/:id/evidence` para subir evidencia, omitiendo el endpoint del courier mobile `/api/courier/services/:id/evidence`.

**Solución:** Se actualizó la tabla de endpoints para documentar ambas rutas, se aclaró que no se debe setear `Content-Type` manualmente en el cliente React Native, y se separaron los formatos de request para app móvil y panel web.

**Archivos modificados:**
- `TracKing-backend/docs/fase-4-evidencias.md`

---

### Resumen de bugs corregidos en esta sesión

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-16 | `evidenceApi` enviaba JSON en lugar de `multipart/form-data` | Upload de evidencia nunca funcionaba | `FormData` con campo `file` binario |
| BUG-17 | Campo `created_at` inexistente en `EvidenceResponse` | Error de tipo en runtime al leer la respuesta | Corregido a `registration_date` |
| BUG-18 | Import de `expo-image-picker` no instalado | Crash al cargar la pantalla de detalle | Reemplazado por `expo-camera` v55 |
| BUG-19 | API de permisos incorrecta en `expo-camera` v55 | Error de módulo en runtime | `Camera.requestCameraPermissionsAsync()` |
| BUG-20 | `setImageUri` eliminado del hook | `EvidenceCapture` crasheaba con `TypeError` | Restaurado en el hook |
| BUG-21 | Documentación indicaba body JSON para evidencia | Confusión para futuros desarrolladores | Guías corregidas en ambos repos |

---

*Actualización: 3 de abril de 2026 — Alineación módulo evidencias v1.1*


---

## 9. Implementación completa del sistema de tracking en tiempo real (Abril 2026)

### Contexto

Se implementó el punto 5 de la guía `TRACKING_MOBILE_GUIDE.md` — reporte de ubicación en tiempo real. El sistema envía la posición del mensajero al backend cada 15 segundos mientras tiene un servicio en estado `IN_TRANSIT`, tanto en foreground como en background.

---

### Análisis del flujo backend (solo lectura — sin modificaciones)

El backend maneja el estado del mensajero así:

| Evento | Estado mensajero |
|---|---|
| Admin asigna servicio | `AVAILABLE` → `IN_SERVICE` |
| Mensajero acepta (`ACCEPTED`) | sigue `IN_SERVICE` |
| Mensajero sale a ruta (`IN_TRANSIT`) | sigue `IN_SERVICE` |
| Mensajero entrega (`DELIVERED`) | `IN_SERVICE` → `AVAILABLE` |

El endpoint `POST /api/courier/location` solo acepta ubicaciones cuando el mensajero está `IN_SERVICE`. Cuando el servicio llega a `DELIVERED`, el backend responde `400` a los siguientes envíos de ubicación.

El mobile activa el tracking cuando el servicio está `IN_TRANSIT` — en ese momento el mensajero ya está `IN_SERVICE` desde la asignación. El flujo es correcto sin modificar el backend.

---

### CAMBIO-22 — Instalación de `expo-task-manager`

**Problema:** El background tracking requiere `expo-task-manager` pero no estaba instalado en el proyecto.

**Solución:** Instalado con `npx expo install expo-task-manager` (versión compatible con SDK 55).

**Archivos modificados:**
- `package.json` — dependencia agregada

---

### CAMBIO-23 — Permisos de background location en `app.json`

**Problema:** `app.json` no tenía habilitado el background location para Android, lo que impedía que la task de background se registrara correctamente.

**Solución:** Agregados `isAndroidBackgroundLocationEnabled: true` e `isAndroidForegroundServiceEnabled: true` al plugin de `expo-location`.

```json
["expo-location", {
  "isAndroidBackgroundLocationEnabled": true,
  "isAndroidForegroundServiceEnabled": true
}]
```

**Archivos modificados:**
- `app.json`

---

### CAMBIO-24 — Creación de la task de background location

**Problema:** No existía ninguna task de background para tracking. Sin esto, cuando el mensajero minimiza la app, el tracking se detiene.

**Solución:** Creado `src/features/tracking/tasks/backgroundLocationTask.ts` con la task global definida a nivel de módulo (requisito de `expo-task-manager`).

Comportamiento de la task:
- Se ejecuta cada 15 segundos o cada 10 metros (lo que ocurra primero)
- Envía `{ latitude, longitude, accuracy }` al backend
- Si el backend responde `400`, detiene la task automáticamente
- Errores de red se swallean silenciosamente

**Archivos creados:**
- `src/features/tracking/tasks/backgroundLocationTask.ts`

---

### CAMBIO-25 — Registro de la task en `index.ts`

**Problema:** La task de background debe estar definida antes de que el árbol React se monte. Sin el import en el entry point, la task no se registra y el background tracking falla silenciosamente.

**Solución:** Agregado el import de la task en `index.ts` antes de `registerRootComponent`.

```typescript
import './src/features/tracking/tasks/backgroundLocationTask';
```

**Archivos modificados:**
- `index.ts`

---

### CAMBIO-26 — Reescritura de `useLocation` con foreground + background + stop en 400

**Problema:** El hook anterior solo tenía foreground tracking con `setInterval`. No tenía:
- Background tracking con `expo-task-manager`
- Detención automática cuando el backend responde `400`
- Gestión correcta del ciclo de vida (start/stop de la task de background)

**Solución:** Reescrito completamente con:

- `requestForegroundPermission` — solicita permiso de foreground (cacheado en ref)
- `requestBackgroundPermission` — solicita permiso de background (cacheado en ref)
- `startBackground` — inicia la task con `timeInterval: 15000` y `distanceInterval: 10`
- `stopForeground` / `stopBackground` / `stopAll` — limpieza correcta
- `sendLocation` — detecta `err.response.status === 400` y detiene todo
- `stoppedByBackend` ref — evita envíos adicionales después de un 400
- Reset del flag `stoppedByBackend` al desactivar (permite reactivación limpia)

**Ciclo de vida:**
```
active=true  → startBackground() + sendLocation() + setInterval(15s)
active=false → clearInterval + stopLocationUpdatesAsync
400 recibido → stoppedByBackend=true + clearInterval + stopLocationUpdatesAsync
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`

---

### CAMBIO-27 — Corrección de `locationApi.ts` (versión en disco desactualizada)

**Problema:** El archivo en disco tenía la versión anterior con `unwrap` importado y retorno `Promise<unknown>`. Aunque el error 400 se propagaba correctamente (el interceptor rechaza antes de llegar a `unwrap`), el código era incorrecto y confuso.

**Causa raíz:** Una escritura anterior no se persistió correctamente en disco.

**Solución:** Reescrito con `async/await` limpio, sin `unwrap`, retornando `Promise<void>`. El error axios original se propaga para que `useLocation` pueda inspeccionar `err.response.status`.

**Archivos modificados:**
- `src/features/tracking/api/locationApi.ts`

---

### CAMBIO-28 — Corrección del loop duplicado en `TrackingMap`

**Problema:** `TrackingMap.tsx` tenía su propio `setInterval` de 15 segundos llamando a `ExpoLocation.getCurrentPositionAsync`, duplicando exactamente el loop de `useLocation`. Esto creaba dos procesos de GPS simultáneos y era la causa de la advertencia de "múltiples hosts" en el debugger.

**Solución:** Eliminado el `setInterval` de `TrackingMap`. El componente ahora hace una sola lectura de ubicación al activarse (para mostrar coordenadas en pantalla). El tracking periódico queda exclusivamente en `useLocation`.

**Archivos modificados:**
- `src/features/tracking/components/TrackingMap.tsx`

---

### CAMBIO-29 — Desactivación del reachability check de NetInfo

**Problema:** `@react-native-community/netinfo` hace ping por defecto a `clients3.google.com` para verificar conectividad a internet. Esto introducía un segundo host externo en la app, causando la advertencia del debugger de React Native sobre "múltiples hosts".

**Solución:** Configurado NetInfo con `reachabilityShouldRun: () => false` para deshabilitar el ping externo. La detección de conectividad sigue funcionando basándose en el estado de la interfaz de red del dispositivo.

**Archivos modificados:**
- `src/core/hooks/useNetworkStatus.ts`

---

### CAMBIO-30 — Suite de tests completa para `useLocation`

**Problema:** El test existente tenía cobertura parcial — no cubría background tracking, stop en 400, ni reactivación después de errores.

**Solución:** Reescrita la suite completa con 18 tests organizados en 5 grupos:

| Grupo | Tests |
|---|---|
| inactive | No envía, no pide permisos |
| foreground tracking | Envío inmediato, intervalo 15s/30s, permiso denegado, detención |
| error handling | Errores de red silenciosos, stop en 400 (foreground + background), no stop en otros errores |
| background tracking | Permiso, inicio con config correcta, no duplica, no inicia sin permiso, detiene al desactivar |
| reactivación | Reanuda después de desactivar, resetea flag de stop-por-400 |

Resultado: **18/18 tests pasan**.

**Archivos modificados:**
- `src/__tests__/tracking/useLocation.test.ts`

---

### CAMBIO-31 — Corrección del spinner infinito al iniciar la app

**Problema:** Si el backend no estaba disponible al iniciar la app, `useSessionRestore` nunca terminaba y la app quedaba en el spinner de carga indefinidamente.

**Causa raíz:** `apiClient` no tenía timeout configurado. Una request a `/api/courier/me` podía colgar indefinidamente si el backend no respondía.

**Solución:**
- Agregado `timeout: 10_000` al `apiClient` (10 segundos máximo por request)
- Reescrito `useSessionRestore` con un `safetyTimer` de 8 segundos que desbloquea la app si la restauración no termina a tiempo
- Variable `done` para evitar doble setState y proteger contra componente desmontado

**Archivos modificados:**
- `src/core/api/apiClient.ts`
- `src/core/hooks/useSessionRestore.ts`

---

### Resumen de bugs corregidos en esta sesión

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-22 | `expo-task-manager` no instalado | Background tracking imposible | Instalado con expo install |
| BUG-23 | Background location no habilitado en app.json | Task de background no se registraba en Android | Flags agregados al plugin |
| BUG-24 | Task de background no definida | Sin tracking al minimizar la app | `backgroundLocationTask.ts` creado |
| BUG-25 | Task no importada en entry point | Task no disponible antes del mount de React | Import en `index.ts` |
| BUG-26 | `useLocation` sin background ni stop en 400 | Tracking solo en foreground, sin detención automática | Hook reescrito completo |
| BUG-27 | `locationApi.ts` con versión desactualizada en disco | Código incorrecto, import innecesario | Reescrito con async/await limpio |
| BUG-28 | `TrackingMap` con loop de GPS duplicado | Dos procesos GPS simultáneos, advertencia de múltiples hosts | Loop eliminado del componente |
| BUG-29 | NetInfo hacía ping a Google | Segundo host externo, advertencia del debugger | `reachabilityShouldRun: false` |
| BUG-30 | Tests de tracking con cobertura parcial | Casos críticos sin validar | Suite completa de 18 tests |
| BUG-31 | App quedaba cargando si backend no respondía | UX bloqueada indefinidamente | Timeout en apiClient + safetyTimer |

---

*Actualización: 3 de abril de 2026 — Sistema de tracking v1.2*

---

## 10. Alineación del módulo de tracking con el backend + mapa WebView (Abril 2026)

### Contexto

Se realizó un análisis completo del módulo de tracking comparando la implementación del mobile contra lo que espera el backend. Se encontraron y corrigieron 5 problemas, y se implementó el mapa interactivo usando WebView + Leaflet.

---

### CAMBIO-32 — `sendFromBackground()` en `locationApi` para background task

**Problema:** El background task llamaba `locationApi.send()` que usa `apiClient` (Axios con interceptores). Cuando la app está en background profundo, el proceso JS puede reiniciarse y el store de Zustand queda vacío — sin token, todas las peticiones fallaban silenciosamente con 401.

**Causa raíz:** `apiClient` obtiene el token desde `useAuthStore.getState().accessToken`. Si Zustand no está inicializado, el token es `null`.

**Solución:** Se agregó `locationApi.sendFromBackground()` que lee el token directamente desde `SecureStore` (persiste en el keychain del dispositivo) y usa `axios` crudo sin pasar por el store.

```typescript
// sendFromBackground — usado por backgroundLocationTask
const token = await secureStorage.getToken();
if (!token) return; // sin sesión — skip silencioso
await axios.post(`${BASE_URL}/api/courier/location`, payload, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Archivos modificados:**
- `src/features/tracking/api/locationApi.ts`
- `src/features/tracking/tasks/backgroundLocationTask.ts`

---

### CAMBIO-33 — `accuracy ?? 0` reemplazado por spread condicional

**Problema:** El mobile enviaba `accuracy: 0` cuando el GPS no reportaba precisión. En el sistema de medición GPS, `0` significa "precisión perfecta de 0 metros" — semánticamente incorrecto. El backend tiene el campo como `@IsOptional()` precisamente para este caso.

**Causa raíz:** Uso de `?? 0` como fallback en lugar de omitir el campo.

**Solución:** Reemplazado por spread condicional en foreground y background:

```typescript
// Antes
accuracy: loc.coords.accuracy ?? 0

// Después
...(loc.coords.accuracy != null && { accuracy: loc.coords.accuracy })
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`
- `src/features/tracking/tasks/backgroundLocationTask.ts`

---

### CAMBIO-34 — `useLocation` ahora retorna coordenadas para display

**Problema:** `useLocation` no retornaba nada. `TrackingMap` hacía su propia lectura GPS independiente, creando dos lecturas simultáneas cuando el tracking estaba activo.

**Solución:** El hook ahora retorna `{ latitude, longitude, permissionDenied }`. Las coordenadas se actualizan en cada ciclo de 15 segundos (mismo momento en que se envían al backend). `TrackingMap` consume estas coords como props — sin segunda lectura GPS.

```typescript
// useLocation ahora retorna:
return {
  latitude: coords?.latitude ?? null,
  longitude: coords?.longitude ?? null,
  permissionDenied,
};
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-35 — `TrackingMap` refactorizado: WebView + Leaflet

**Problema:** `TrackingMap` mostraba solo coordenadas en texto plano. No había mapa visual, y el componente hacía su propia lectura GPS duplicando el trabajo de `useLocation`.

**Solución:** Reescrito completamente con:

- **WebView + Leaflet 1.9.4** — mismo tile provider (OpenStreetMap) que el frontend web
- **Sin lectura GPS propia** — recibe `latitude`, `longitude`, `permissionDenied` como props
- **`buildLeafletHtml(lat, lng)`** — genera HTML con mapa centrado en la posición del mensajero
- **`useMemo`** — reconstruye el HTML solo cuando las coords cambian (cada ~15s)
- **Marcador personalizado** — círculo azul con borde blanco y anillo de glow (mismo estilo que el frontend)
- **Estados de UI** — sin servicio activo / permiso denegado / esperando GPS / mapa activo

```
TrackingMap states:
  !active          → "Sin servicio activo"
  permissionDenied → "Permiso de ubicación denegado"
  coords null      → ActivityIndicator "Obteniendo ubicación..."
  coords available → WebView con mapa Leaflet
```

**Dependencia instalada:** `react-native-webview` (compatible con Expo SDK 55)

**Archivos modificados/creados:**
- `src/features/tracking/components/TrackingMap.tsx`
- `package.json` — `react-native-webview` agregado

---

### CAMBIO-36 — Documentación de fase 06 actualizada

**Problema:** `docs/phase-06-tracking.md` estaba desactualizado — describía una implementación anterior con intervalos de 10s, archivos que no existen y criterios de completitud incorrectos.

**Solución:** Reescrito completamente con:
- Diagrama de arquitectura actualizado
- Tabla de endpoint con auth y notas de validación
- Sección dedicada a la implementación WebView + Leaflet con tabla comparativa vs react-native-maps
- Estrategia del background task y token desde SecureStore
- Criterios de completitud actualizados (todos marcados excepto upgrade a react-native-maps)

**Archivos modificados:**
- `docs/phase-06-tracking.md`

---

### Resumen de cambios en esta sesión

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-32 | `sendFromBackground()` con token desde SecureStore | Background tracking funciona aunque Zustand esté vacío |
| CAMBIO-33 | `accuracy ?? 0` → spread condicional | Datos de precisión semánticamente correctos |
| CAMBIO-34 | `useLocation` retorna coords para display | Elimina doble lectura GPS |
| CAMBIO-35 | `TrackingMap` con WebView + Leaflet | Mapa interactivo real en lugar de texto de coordenadas |
| CAMBIO-36 | Documentación fase 06 actualizada | Refleja la implementación real |

---

*Actualización: 6 de abril de 2026 — Tracking map WebView v1.0*

---

## 11. Tracking por estado del mensajero + flujo de pago al finalizar (Abril 2026)

### Contexto

Dos cambios técnicos en el módulo de servicios y tracking:
1. El trigger del tracking GPS se mueve del estado del servicio (`IN_TRANSIT`) al estado operacional del mensajero (`IN_SERVICE`), alineándose con la regla del backend.
2. Al finalizar un servicio (`DELIVERED`), se muestra un modal preguntando si el cliente pagó, usando el nuevo endpoint `POST /api/courier/services/:id/payment`.

---

### CAMBIO-37 — Tracking activado por `operationalStatus === 'IN_SERVICE'`

**Problema:** El tracking se activaba cuando `service.status === 'IN_TRANSIT'`. El backend valida que el mensajero esté en estado `IN_SERVICE` para aceptar ubicaciones — no el estado del servicio. Esto podía causar que el tracking se activara antes de que el backend lo permitiera.

**Decisión técnica:** El estado del mensajero (`IN_SERVICE`) es el marcador correcto. El mensajero entra en `IN_SERVICE` cuando se le asigna un servicio, y sale cuando lo entrega. El estado del servicio (`IN_TRANSIT`) es un subestado dentro de ese período.

**Solución:**
- `OperationalStatus` ahora incluye `'IN_SERVICE'` (antes solo `'AVAILABLE' | 'UNAVAILABLE'`)
- `ServiceDetailScreen` lee `operationalStatus` del `useAuthStore` y lo pasa a `useLocation`
- `useLocation({ active: operationalStatus === 'IN_SERVICE' })`

```typescript
// Antes
useLocation({ active: service?.status === 'IN_TRANSIT' })

// Después
const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
useLocation({ active: operationalStatus === 'IN_SERVICE' })
```

**Archivos modificados:**
- `src/features/auth/types/auth.types.ts` — `IN_SERVICE` agregado al tipo
- `src/features/services/screens/ServiceDetailScreen.tsx` — trigger actualizado

---

### CAMBIO-38 — Tipos de pago en `services.types.ts`

**Problema:** `Service` tenía `payment_method: string` genérico. Los nuevos campos `payment_status`, `is_settled_courier`, `is_settled_customer` no existían en el tipo.

**Solución:** Tipos actualizados con enums estrictos según `PAYMENT_CHANGES.md`:

```typescript
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'UNPAID';

export interface Service {
  // ...
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  is_settled_courier: boolean;
  is_settled_customer: boolean;
}
```

**Archivos modificados:**
- `src/features/services/types/services.types.ts`

---

### CAMBIO-39 — `servicesApi.updatePayment()`

**Problema:** No existía ningún método para llamar al endpoint de cambio de pago.

**Solución:** Agregado `updatePayment(id, payment_status)` que llama a `POST /api/courier/services/:id/payment`.

```typescript
updatePayment: (id: string, payment_status: PaymentStatus): Promise<Service> =>
  apiClient
    .post<ApiResponse<Service>>(`/api/courier/services/${id}/payment`, { payment_status })
    .then(unwrap),
```

**Archivos modificados:**
- `src/features/services/api/servicesApi.ts`

---

### CAMBIO-40 — `performPaymentAction` en `useServiceDetail`

**Problema:** `useServiceDetail` no tenía forma de actualizar el estado de pago.

**Solución:** Agregado `performPaymentAction(serviceId, payment_status)` con su propio estado `paymentLoading`. Actualiza el store con el servicio retornado por el backend.

**Archivos modificados:**
- `src/features/services/hooks/useServices.ts`

---

### CAMBIO-41 — Modal de pago al finalizar entrega

**Problema:** Al marcar un servicio como `DELIVERED`, no había forma de registrar si el cliente pagó o no.

**Flujo implementado:**
1. Mensajero presiona "Finalizar entrega"
2. Backend transiciona el servicio a `DELIVERED`
3. Se muestra un bottom sheet modal: "¿Te pagaron el servicio?"
4. Opciones:
   - **"Sí, me pagaron"** → `POST /api/courier/services/:id/payment { payment_status: "PAID" }`
   - **"No me pagaron"** → `POST /api/courier/services/:id/payment { payment_status: "UNPAID" }`
   - **"Mantener estado actual"** → cierra el modal sin llamar al backend

El modal muestra el total del servicio para referencia. Si la llamada al backend falla, muestra un `Alert` no bloqueante.

La pantalla también muestra `payment_method` y `payment_status` en la sección de paquete, con el estado `UNPAID` resaltado en rojo.

**Archivos modificados:**
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### Resumen de cambios

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-37 | Tracking por `IN_SERVICE` del mensajero | Alineado con regla del backend |
| CAMBIO-38 | Tipos `PaymentMethod`, `PaymentStatus`, `is_settled_*` | Tipos correctos para los nuevos campos |
| CAMBIO-39 | `servicesApi.updatePayment()` | Endpoint de pago disponible |
| CAMBIO-40 | `performPaymentAction` en `useServiceDetail` | Lógica de pago encapsulada en el hook |
| CAMBIO-41 | Modal de pago al finalizar entrega | Mensajero puede registrar cobro en campo |

---

*Actualización: 6 de abril de 2026 — Payment flow v1.0*

---

## 9. Refactor visual — Design System & UI Evolution (Abril 2026)

### Contexto

Se realizó una evolución visual progresiva de la app basada en imágenes de referencia de diseño. El objetivo fue modernizar la UI sin romper ninguna lógica existente. Todos los cambios son puramente de presentación.

> Ver documentación completa en `docs/phase-09-design-system-refactor.md`

---

### CAMBIO-42 — Expansión del Design System

**Problema:** `colors.ts` tenía 7 tokens sin semántica de estados. No existían `spacing.ts`, `shadows.ts` ni componentes UI base reutilizables.

**Solución:** Se crearon/expandieron los siguientes archivos:

- `colors.ts` → 24 tokens con colores semánticos (`successBg`, `warningText`, `infoBg`, `background`, etc.)
- `typography.ts` → escala ampliada (`xxxl: 36`, `display: 44`), peso `extrabold: '800'`, presets `textStyles`
- `spacing.ts` → escala base-4 (`xs` a `huge`) + `borderRadius` (`sm` a `full`)
- `shadows.ts` → sombras cross-platform iOS/Android con preset `primary` (sombra azul para cards hero)
- `shared/ui/index.ts` → barrel export del design system

**Archivos creados/modificados:**
- `src/shared/ui/colors.ts`
- `src/shared/ui/typography.ts`
- `src/shared/ui/spacing.ts` ← nuevo
- `src/shared/ui/shadows.ts` ← nuevo
- `src/shared/ui/index.ts` ← nuevo

---

### CAMBIO-43 — Componentes UI base reutilizables

**Problema:** No existían componentes UI atómicos. Cada pantalla definía sus propios estilos de botones, inputs y badges de forma inconsistente.

**Solución:** Se creó `src/shared/ui/components/` con:

- `Button` — variantes `primary/outline/ghost/success/danger`, tamaños `sm/md/lg`, soporte de ícono y loading
- `Input` — label, ícono izquierdo/derecho, mensaje de error, toggle de contraseña
- `StatusBadge` — badge centralizado con variantes semánticas (`success/warning/danger/info/primary/neutral`) y punto indicador
- `Card` — contenedor base con sombra configurable
- `index.ts` — barrel export

El `StatusBadge` de `src/features/services/components/StatusBadge.tsx` fue refactorizado como wrapper del centralizado, manteniendo compatibilidad con el tipo `ServiceStatus`.

**Archivos creados:**
- `src/shared/ui/components/Button.tsx`
- `src/shared/ui/components/Input.tsx`
- `src/shared/ui/components/StatusBadge.tsx`
- `src/shared/ui/components/Card.tsx`
- `src/shared/ui/components/index.ts`

**Archivos modificados:**
- `src/features/services/components/StatusBadge.tsx`

---

### CAMBIO-44 — Refactor visual LoginScreen

**Problema:** Login en inglés, sin hero visual, inputs sin íconos, sin toggle de contraseña, sin link de recuperación, sin botón biométrico.

**Solución:** Rediseño visual completo manteniendo toda la lógica de `useLogin`, `react-hook-form` y validaciones:

- Hero con ícono en círculo `primaryBg`
- Título "Bienvenido, Mensajero" + subtítulo descriptivo
- Inputs usando el componente `Input` con íconos y toggle de contraseña
- Link "¿Olvidaste tu contraseña?"
- Botón "Iniciar Sesión →" con sombra de color primario
- Botón biométrico circular
- Footer de versión

**Archivos modificados:**
- `src/features/auth/screens/LoginScreen.tsx`

---

### CAMBIO-45 — Refactor visual Header del dashboard

**Problema:** Header mostraba nombre pequeño + badge de estado online/offline. Sin fecha, sin avatar, sin notificaciones.

**Solución:**
- Greeting grande con `fontWeight.extrabold` (`Hola, {nombre}`)
- Fecha actual formateada en español
- Botón de notificación con punto rojo indicador
- Avatar circular con inicial del nombre, borde azul si está online

**Archivos modificados:**
- `src/features/dashboard/components/Header.tsx`

---

### CAMBIO-46 — Refactor visual KPIBox + nuevo DailyProgress

**Problema:** KPIs sin ícono, alineados al centro, sin diferenciación visual clara. Sin barra de progreso diario.

**Solución:**
- `KPIBox` ahora acepta prop `icon` (emoji), alineación a la izquierda, layout más compacto
- Nuevo componente `DailyProgress`: barra de progreso con porcentaje calculado y contador `X/Y Completados`

**Archivos modificados/creados:**
- `src/features/dashboard/components/KPIBox.tsx`
- `src/features/dashboard/components/DailyProgress.tsx` ← nuevo

---

### CAMBIO-47 — Refactor visual ActiveServiceCard

**Problema:** Card simple sin jerarquía visual clara. Sin conector de ruta, sin acciones rápidas, sin información del cliente.

**Solución:**
- Borde azul primario en la card activa
- Fila superior: badge + ID de orden + hora
- Conector visual recogida→entrega con línea vertical y puntos de color
- Footer: avatar con inicial, nombre del cliente, método de pago
- Botones de acción: llamar (circular) + Navegar (azul sólido)

**Archivos modificados:**
- `src/features/dashboard/components/ActiveServiceCard.tsx`

---

### CAMBIO-48 — Refactor visual HomeScreen

**Problema:** Home sin tabs de filtro, sin progreso diario, KPIs sin ícono "En Ruta".

**Solución:**
- Integración de `DailyProgress` entre KPIs y tabs
- Tabs de filtro Todos/Pendientes/Completados con pill activo
- KPI "En Ruta" usando el nuevo campo `kpis.inTransit`
- Fondo `colors.background` (`#F4F6FA`) en lugar de `neutral50`
- Estado vacío con ícono y subtexto

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-49 — Campo `inTransit` en KPISummary

**Problema:** `KPISummary` no tenía campo para servicios en tránsito. El KPI "En Ruta" no podía mostrarse.

**Solución:**
- Agregado `inTransit: number` a la interfaz `KPISummary`
- `computeKPIs` actualizado: `pending` ahora solo cuenta `ASSIGNED`, `inTransit` cuenta `ACCEPTED + IN_TRANSIT`
- `DEFAULT_KPIS` actualizado con `inTransit: 0`

**Archivos modificados:**
- `src/features/dashboard/types/dashboard.types.ts`
- `src/features/dashboard/api/dashboardApi.ts`
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-50 — Refactor visual EarningsScreen

**Problema:** Pantalla de ganancias sin estructura de liquidación del día, sin stats de pedidos/tiempo/distancia, sin secciones de ingresos y deducciones, sin CTA fijo.

**Solución:**
- Header con título "Liquidación del Día" + botón calendario
- Hero card azul con sombra `shadows.primary`, monto en `fontSize.xxxl`, badge de variación
- Stats row: 3 chips blancos (Pedidos / Tiempo / Distancia)
- Secciones "Ingresos" y "Deducciones" con `IncomeRow` (ícono en cuadro, título, subtítulo, monto)
- CTA fijo "Transferir a mi Cuenta →" con `position: absolute` en la parte inferior

**Archivos modificados:**
- `src/features/earnings/screens/EarningsScreen.tsx`

---

### Resumen de cambios

| ID | Cambio | Archivos |
|---|---|---|
| CAMBIO-42 | Design system expandido | `colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`, `index.ts` |
| CAMBIO-43 | Componentes UI base | `Button`, `Input`, `StatusBadge`, `Card` en `shared/ui/components/` |
| CAMBIO-44 | LoginScreen rediseñado | `LoginScreen.tsx` |
| CAMBIO-45 | Header con greeting, fecha, avatar | `Header.tsx` |
| CAMBIO-46 | KPIBox con ícono + DailyProgress | `KPIBox.tsx`, `DailyProgress.tsx` |
| CAMBIO-47 | ActiveServiceCard con ruta y acciones | `ActiveServiceCard.tsx` |
| CAMBIO-48 | HomeScreen con tabs y progreso | `HomeScreen.tsx` |
| CAMBIO-49 | `inTransit` en KPISummary | `dashboard.types.ts`, `dashboardApi.ts`, `useDashboard.ts` |
| CAMBIO-50 | EarningsScreen con hero, stats, CTA | `EarningsScreen.tsx` |

---

*Actualización: 10 de abril de 2026 — Design System Refactor v1.0*

---

## 10. Dashboard funcional — Conexión real de UI a datos (Abril 2026)

### Contexto

Tras el refactor visual (sección 9), se detectó que el módulo de dashboard tenía la UI completa pero con lógica incompleta o simulada. Se realizó una segunda pasada para conectar cada elemento visual a datos reales y eliminar todo valor hardcodeado.

---

### CAMBIO-51 — Corrección del interceptor de refresh para rutas de auth

**Problema:** Al fallar el login con credenciales incorrectas (401), el interceptor de respuesta intentaba hacer `POST /api/auth/refresh`. Ese refresh también fallaba con 401, lo que volvía a disparar el interceptor, generando un loop hasta que el timeout de 10s cortaba la ejecución. La app se quedaba cargando indefinidamente.

**Causa raíz:** El interceptor de 401 no excluía las rutas de autenticación. Un 401 en `/api/auth/login` no significa sesión expirada — significa credenciales incorrectas.

**Solución:** Se agregó la condición `!isAuthEndpoint` al guard del interceptor:

```ts
const isAuthEndpoint =
  originalRequest.url?.includes('/api/auth/login') ||
  originalRequest.url?.includes('/api/auth/refresh');

if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
  // refresh logic
}
```

Adicionalmente, se corrigió el orden de lectura del mensaje de error: NestJS pone el mensaje útil en `message` (no en `error`), por lo que se invirtió la prioridad: `responseData?.message ?? responseData?.error`.

**Archivos modificados:**
- `src/core/api/apiClient.ts`

---

### CAMBIO-52 — Tabs del dashboard sin funcionalidad real

**Problema:** `HomeScreen` tenía tres tabs (Todos / Pendientes / Completados) con estado `activeTab` local, pero ese estado nunca se usaba para filtrar servicios. Los tabs eran puramente decorativos.

**Causa raíz:** La lógica de filtrado no estaba implementada ni en el componente ni en el hook.

**Solución:** La lógica de filtrado se centralizó en `useDashboard` mediante `TAB_STATUSES`:

```ts
const TAB_STATUSES: Record<DashboardTab, ServiceStatus[]> = {
  all:       ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'],
  pending:   ['ASSIGNED', 'ACCEPTED'],
  completed: ['DELIVERED'],
};
```

El hook ahora expone `filteredServices`, `activeTab` y `setActiveTab`. `HomeScreen` consume estos valores directamente.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-53 — HomeScreen: ScrollView reemplazado por FlatList

**Problema:** `HomeScreen` usaba `ScrollView` para mostrar la lista de servicios, lo que no es eficiente para listas variables y no permite `renderItem` tipado.

**Solución:** Reemplazado por `FlatList` con `ListHeaderComponent` para los KPIs, progreso y tabs. La lista de servicios se renderiza con `ServiceCard` existente, reutilizando el componente sin duplicar código.

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-54 — Fallback hardcodeado `|| 10` en DailyProgress

**Problema:** `HomeScreen` pasaba `total={totalOrders || 10}` a `DailyProgress`. Cuando no había servicios, la barra mostraba `0/10` en lugar de `0/0`.

**Causa raíz:** Fallback defensivo incorrecto — `DailyProgress` ya maneja `total=0` correctamente (`pct = 0`).

**Solución:** Eliminado el fallback. `totalOrders` se calcula como la suma real de los tres KPIs:

```ts
const totalOrders = kpis.pending + kpis.inTransit + kpis.completed;
```

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-55 — ActiveServiceCard sin navegación funcional

**Problema:** `ActiveServiceCard` recibía props `onPress` y `onNavigate` pero `HomeScreen` no las implementaba. Tocar la card o el botón "Navegar" no hacía nada.

**Causa raíz:** Las props estaban definidas pero sin handler en el componente padre.

**Solución:** `HomeScreen` implementa `handleServicePress` que navega a la tab `Orders` usando `useNavigation<BottomTabNavigationProp>`. El `ServicesNavigator` dentro de esa tab maneja el stack de detalle.

```ts
function handleServicePress(_service: Service) {
  navigation.navigate('Orders');
}
```

La `ActiveServiceCard` solo se muestra en el tab "Todos" para evitar duplicación con la lista filtrada.

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-56 — Tiempo hardcodeado en ActiveServiceCard

**Problema:** La card mostraba `new Date().toLocaleTimeString(...)` como si fuera la hora del servicio. Era la hora actual del dispositivo, no un dato real del servicio.

**Causa raíz:** El tipo `Service` no tiene campo de fecha/hora. El dato era inventado.

**Solución:** Eliminado el elemento de tiempo y su estilo asociado (`time`).

**Archivos modificados:**
- `src/features/dashboard/components/ActiveServiceCard.tsx`

---

### CAMBIO-57 — Estado vacío genérico para todos los tabs

**Problema:** El estado vacío mostraba siempre "Sin servicio activo / Tus pedidos aparecerán aquí" independientemente del tab activo.

**Solución:** Mensaje contextual según el tab:

```ts
activeTab === 'completed' ? 'Sin entregas completadas'
: activeTab === 'pending'  ? 'Sin pedidos pendientes'
: 'Sin servicios asignados'
```

**Archivos modificados:**
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-58 — Import `useRef` sin usar en useDashboard

**Problema:** `useDashboard` importaba `useRef` de React pero no lo usaba.

**Solución:** Eliminado del import.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`

---

### Resumen de cambios

| ID | Cambio | Archivos |
|---|---|---|
| CAMBIO-51 | Interceptor de refresh excluye rutas de auth | `apiClient.ts` |
| CAMBIO-52 | Tabs del dashboard conectados a filtrado real | `useDashboard.ts`, `HomeScreen.tsx` |
| CAMBIO-53 | ScrollView → FlatList con ServiceCard | `HomeScreen.tsx` |
| CAMBIO-54 | Eliminado fallback `\|\| 10` en DailyProgress | `HomeScreen.tsx` |
| CAMBIO-55 | Navegación real desde ActiveServiceCard | `HomeScreen.tsx` |
| CAMBIO-56 | Eliminado `new Date()` hardcodeado en card | `ActiveServiceCard.tsx` |
| CAMBIO-57 | Empty state contextual por tab | `HomeScreen.tsx` |
| CAMBIO-58 | `useRef` sin usar eliminado | `useDashboard.ts` |

---

*Actualización: 10 de abril de 2026 — Dashboard funcional v1.0*


---

## 9. Sistema de Temas — Dark Mode / Light Mode (Abril 2026)

### Contexto

Se implementó y corrigió el sistema completo de temas dinámicos (dark/light mode) en la app. El objetivo fue eliminar todos los colores hardcodeados de componentes y pantallas, y garantizar que cada elemento visual responda correctamente al tema activo.

> **Restricción clave:** Solo se modificaron estilos y colores. Ningún hook, store, API ni lógica de negocio fue alterada.

---

### Arquitectura del sistema de temas

| Archivo | Rol |
|---|---|
| `src/shared/ui/colors.ts` | Paleta light mode — fuente de verdad para tokens de color |
| `src/shared/ui/darkColors.ts` | Paleta dark mode — mismos tokens, valores ajustados para contraste |
| `src/shared/ui/theme.store.ts` | Store Zustand — gestiona modo activo, persiste en `SecureStore` |
| `src/shared/ui/useTheme.ts` | Hook principal — expone `colors`, `isDark`, `toggle`, `setMode` |
| `src/shared/ui/navigationTheme.ts` | Mapea tokens al `Theme` de React Navigation |
| `src/app/providers/AppProviders.tsx` | Hidrata el tema persistido antes del primer render |

**Regla de uso:** Los componentes siempre deben usar `const { colors } = useTheme()` en lugar de importar `colors` estáticamente. Los imports estáticos se congelan en el valor del momento de carga del módulo y no reaccionan a cambios de tema.

---

### CAMBIO-59 — Eliminación de colores hardcodeados en componentes compartidos

**Problema:** Varios componentes tenían `color: '#fff'` en sus `StyleSheet.create` estáticos, lo que impedía que el color del texto respondiera al tema.

**Archivos y correcciones:**

| Archivo | Hardcode eliminado | Reemplazo |
|---|---|---|
| `shared/components/ErrorState.tsx` | `color: '#fff'` en `buttonText` | `{ color: colors.white }` inline |
| `shared/components/NetworkBanner.tsx` | `color: '#fff'` en `text` | `{ color: colors.white }` inline |

**Patrón aplicado:** El color se movió del `StyleSheet.create` estático a un inline style dinámico en el JSX, donde `colors` ya está disponible desde `useTheme()`.

---

### CAMBIO-60 — Eliminación de colores hardcodeados en pantallas de features

**Problema:** Múltiples pantallas tenían `color: '#fff'` y `color: '#fff'` en `ActivityIndicator` dentro de `StyleSheet.create`, haciendo que el texto de botones y spinners no respondiera al tema.

**Archivos y correcciones:**

| Archivo | Hardcode eliminado | Reemplazo |
|---|---|---|
| `features/workday/screens/WorkdayScreen.tsx` | `color: '#fff'` en `btnText` + `ActivityIndicator` (×2) | `{ color: colors.white }` inline + `color={colors.white}` |
| `features/services/screens/ServiceDetailScreen.tsx` | `color: '#fff'` en `actionBtnText` y modal `btnText` | `{ color: colors.white }` inline |
| `features/services/screens/ServiceDetailScreen.tsx` | `rgba(0,0,0,0.45)` en overlay del modal | `colors.black + '73'` (hex opacity equivalente) |
| `features/evidence/components/EvidenceCapture.tsx` | `color: '#fff'` en `btnText` + `ActivityIndicator` | `{ color: colors.white }` inline + `color={colors.white}` |
| `features/auth/screens/LoginScreen.tsx` | `color: '#fff'` en `buttonText` | `{ color: colors.white }` inline |
| `features/auth/screens/LoginScreen.tsx` | `backgroundColor: colors.white` en `SafeAreaView` | `colors.background` — fondo correcto según tema |

---

### CAMBIO-61 — Corrección del fondo de LoginScreen en dark mode

**Problema:** `LoginScreen` usaba `colors.white` como fondo del `SafeAreaView`. En dark mode el fondo quedaba blanco en lugar de oscuro.

**Causa raíz:** El fondo debía ser `colors.background` (que en dark mode es `#0B121E`) no `colors.white`.

**Solución:** `backgroundColor: colors.white` → `backgroundColor: colors.background`.

**Archivos modificados:**
- `src/features/auth/screens/LoginScreen.tsx`

---

### CAMBIO-62 — Sistema de sombras dinámico

**Problema:** `shadows.ts` tenía `shadowColor: '#000'` y `shadowColor: '#2563EB'` hardcodeados como constantes internas. En iOS, el `shadowColor` afecta visualmente la sombra y debería usar el token del tema.

**Solución:** Las constantes internas se mantienen como fallback, pero todos los componentes que usan sombras ahora pasan `shadowColor` dinámico inline:

```tsx
// Antes
<View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>

// Después
<View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
```

Para sombras de color primario:
```tsx
<View style={[styles.heroCard, { backgroundColor: colors.primary, shadowColor: colors.primary }, shadows.primary]}>
```

**Archivos modificados:**
- `src/features/workday/screens/WorkdayScreen.tsx` (×2 sombras)
- `src/features/dashboard/components/KPIBox.tsx`
- `src/features/dashboard/components/ActiveServiceCard.tsx`
- `src/features/services/components/ServiceCard.tsx` (×3 variantes de card)
- `src/features/earnings/screens/EarningsScreen.tsx` (×5 elementos con sombra)
- `src/features/auth/screens/LoginScreen.tsx` (×2 sombras)

---

### CAMBIO-63 — Corrección del splash de carga en AppProviders

**Problema:** El spinner de carga inicial (antes de hidratar el tema) usaba colores hardcodeados:
```tsx
backgroundColor: '#0B121E'  // dark background hardcodeado
color="#2563EB"              // primary hardcodeado
```

**Causa raíz:** El comentario decía "useTheme() no puede usarse antes de la hidratación", pero `themeColors` del store ya estaba disponible en el mismo componente.

**Solución:** Se usa `themeColors` (ya suscrito al store) en lugar de valores literales:
```tsx
backgroundColor: themeColors.background
color={themeColors.primary}
```

**Archivos modificados:**
- `src/app/providers/AppProviders.tsx`

---

### CAMBIO-64 — Mapa de Leaflet con colores dinámicos

**Problema:** `TrackingMap.tsx` generaba HTML de Leaflet con colores hardcodeados en el string:
```js
background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.3)
```

**Causa raíz:** La función `buildLeafletHtml` no recibía los colores del tema como parámetros.

**Solución:** La función ahora acepta `primaryColor` y `borderColor` como parámetros. El `useMemo` los pasa desde `colors`:
```tsx
const mapHtml = useMemo(() => {
  if (latitude == null || longitude == null) return null;
  return buildLeafletHtml(latitude, longitude, colors.primary, colors.white);
}, [latitude, longitude, colors.primary, colors.white]);
```

El halo de la sombra usa `${primaryColor}4D` (hex opacity 30%).

**Archivos modificados:**
- `src/features/tracking/components/TrackingMap.tsx`

---

### CAMBIO-65 — Color de notificación de tracking dinámico

**Problema:** `useLocation.ts` tenía `notificationColor: '#2563EB'` hardcodeado en la configuración del `foregroundService` de Android.

**Causa raíz:** El `foregroundService` se ejecuta en un background task fuera del contexto de React, por lo que no puede usar `useTheme()`. Sin embargo, el valor podía referenciarse desde el token estático.

**Solución:** Se importa `colors` estáticamente desde `colors.ts` y se usa `colors.primary`:
```ts
import { colors } from '@/shared/ui/colors';
// ...
notificationColor: colors.primary,
```

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`

---

### CAMBIO-66 — Corrección de tokens de texto en dark mode (legibilidad)

**Problema:** En dark mode el texto principal era ilegible. Los tokens `neutral800` y `neutral900` en `darkColors.ts` tenían valores de fondo oscuro en lugar de valores de texto claro.

**Causa raíz:** Los neutrals del dark mode estaban definidos con la misma semántica que en light mode (escala de oscuro a claro), pero en dark mode la escala debe invertirse para texto sobre fondos oscuros.

**Antes:**
```ts
neutral500:   '#475569', // muy oscuro — invisible sobre surface dark
neutral800:   '#1E293B', // casi igual al surface — texto invisible
neutral900:   '#0F172A', // igual al background — texto invisible
```

**Después:**
```ts
neutral500:   '#94A3B8', // texto terciario / subtítulos — legible
neutral800:   '#E2E8F0', // texto principal sobre superficies oscuras
neutral900:   '#F8FAFC', // títulos y texto de mayor jerarquía
```

**Archivos modificados:**
- `src/shared/ui/darkColors.ts`

---

### CAMBIO-67 — Fondo de la barra de tabs dinámico en ServicesScreen

**Problema:** El contenedor de tabs de filtro (`tabsContainer`) usaba `colors.neutral100` como fondo. En dark mode ese token es `#E2E8F0` (claro), haciendo que la barra apareciera blanca sobre el fondo oscuro.

**Causa raíz:** `neutral100` en dark mode es un color de texto/borde, no un color de superficie. El contenedor de tabs necesita un color de superficie oscura.

**Solución:** Cambiado a `colors.surfaceRaised` que en dark mode es `#1A2840` y en light mode es `#FFFFFF`.

```tsx
// Antes
<View style={[styles.tabsContainer, { backgroundColor: colors.neutral100 }]}>

// Después
<View style={[styles.tabsContainer, { backgroundColor: colors.surfaceRaised }]}>
```

**Archivos modificados:**
- `src/features/services/screens/ServicesScreen.tsx`

---

### CAMBIO-68 — Eliminación de bordes en la barra de filtros

**Problema:** La barra de filtros con tabs mostraba dos líneas divisorias (una bajo el header y otra bajo los tabs) que visualmente no eran deseadas.

**Causa raíz:** Los estilos `header` y `tabsWrapper` tenían `borderBottomWidth: 1` con `borderBottomColor` en el JSX inline.

**Solución:** Eliminados `borderBottomWidth: 1` de ambos estilos y sus referencias `borderBottomColor` del JSX.

**Archivos modificados:**
- `src/features/services/screens/ServicesScreen.tsx`

---

### CAMBIO-69 — Overlay del modal de pago dinámico

**Problema:** El overlay del `PaymentModal` en `ServiceDetailScreen` usaba `rgba(0,0,0,0.45)` hardcodeado en `StyleSheet.create`, que no puede acceder al tema.

**Solución:** El `backgroundColor` del overlay se movió a inline style usando `colors.black + '73'` (equivalente hex al 45% de opacidad):

```tsx
// Antes (en StyleSheet.create)
overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }

// Después (inline en JSX, colors viene como prop)
<View style={[modalStyles.overlay, { backgroundColor: colors.black + '73' }]}>
```

**Archivos modificados:**
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-70 — Overlays semitransparentes en EarningsScreen

**Problema:** El hero card de ganancias usaba `rgba(255,255,255,0.8)` y `rgba(255,255,255,0.2)` para el label y el badge sobre el fondo primario.

**Solución:**
- Label: `color: 'rgba(255,255,255,0.8)'` → `{ color: colors.white, opacity: 0.8 }`
- Badge: `backgroundColor: 'rgba(255,255,255,0.2)'` → `{ backgroundColor: colors.primaryDark }`

**Archivos modificados:**
- `src/features/earnings/screens/EarningsScreen.tsx`

---

### Resumen de cambios — Sistema de temas (Abril 2026)

| ID | Cambio | Archivos afectados |
|---|---|---|
| CAMBIO-59 | `#fff` en componentes compartidos | `ErrorState.tsx`, `NetworkBanner.tsx` |
| CAMBIO-60 | `#fff` en pantallas de features | `WorkdayScreen.tsx`, `ServiceDetailScreen.tsx`, `EvidenceCapture.tsx`, `LoginScreen.tsx` |
| CAMBIO-61 | Fondo de LoginScreen corregido a `colors.background` | `LoginScreen.tsx` |
| CAMBIO-62 | `shadowColor` dinámico en todos los componentes con sombra | 6 archivos |
| CAMBIO-63 | Splash de carga usa `themeColors` del store | `AppProviders.tsx` |
| CAMBIO-64 | HTML de Leaflet con colores dinámicos | `TrackingMap.tsx` |
| CAMBIO-65 | `notificationColor` usa token estático `colors.primary` | `useLocation.ts` |
| CAMBIO-66 | Tokens de texto dark mode corregidos para legibilidad | `darkColors.ts` |
| CAMBIO-67 | Fondo de tabs usa `colors.surfaceRaised` | `ServicesScreen.tsx` |
| CAMBIO-68 | Bordes de la barra de filtros eliminados | `ServicesScreen.tsx` |
| CAMBIO-69 | Overlay del modal de pago dinámico | `ServiceDetailScreen.tsx` |
| CAMBIO-70 | Overlays semitransparentes en hero card | `EarningsScreen.tsx` |

### Criterios de validación

| Verificación | Resultado |
|---|---|
| `getDiagnostics` en todos los archivos modificados | ✅ 0 errores |
| Ningún `#hex` hardcodeado fuera de archivos de tokens | ✅ |
| Ningún `rgba()` hardcodeado en componentes | ✅ |
| Ningún `'white'` / `'black'` literal en estilos | ✅ |
| Texto legible en dark mode (`neutral800`, `neutral900` corregidos) | ✅ |
| Barra de tabs oscura en dark mode | ✅ |
| Sombras iOS usan `shadowColor` del tema | ✅ |

*Actualización: 12 de abril de 2026 — Dark Mode completo v1.0*


---

## 12. Implementación del mapa con Maptiler + TrackingScreen completo (Abril 2026)

### Contexto

Se realizó la migración completa del sistema de mapas de OpenStreetMap directo a Maptiler, se implementó la pantalla dedicada de mapa (`TrackingScreen`) con visualización de origen/destino del servicio activo, y se resolvió el problema de doble interval de tracking al introducir un store compartido de coordenadas.

---

### CAMBIO-52 — Migración de tiles OSM a Maptiler

**Problema:** `TrackingMap` y `CourierServiceMap` usaban tiles directos de `tile.openstreetmap.org`. Los servidores de OSM tienen políticas de uso que restringen apps comerciales con alto volumen de requests. Con muchos mensajeros activos simultáneamente, los tiles podían bloquearse o degradarse.

**Decisión técnica:** Maptiler usa los mismos datos de OpenStreetMap pero con CDN propio, free tier de 100k tiles/mes y tiers pagos predecibles. El cambio es solo de URL — la lógica de Leaflet no se modifica.

**Solución:** Reemplazada la URL del `L.tileLayer` en ambos componentes:

```javascript
// Antes
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// Después
'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAPTILER_KEY}'
```

**Archivos modificados:**
- `src/features/tracking/components/TrackingMap.tsx`
- `src/features/services/components/CourierServiceMap.tsx`

---

### CAMBIO-53 — Centralización de la API key en `src/config/map.ts`

**Problema:** Ambos componentes tenían `const MAPTILER_KEY = 'YOUR_MAPTILER_API_KEY'` hardcodeado como placeholder. Esto rompía la carga de tiles en producción (403 de Maptiler) y duplicaba la configuración.

**Solución:** Creado `src/config/map.ts` como fuente única de verdad:

```typescript
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

if (__DEV__ && !MAPTILER_KEY) {
  console.warn('[map.ts] EXPO_PUBLIC_MAPTILER_KEY is missing. Map tiles will fail (403).');
}
```

Ambos componentes importan `MAPTILER_KEY` desde este archivo. El warning en `__DEV__` facilita detectar el problema durante desarrollo sin romper producción.

**Archivos creados:**
- `src/config/map.ts`

**Archivos modificados:**
- `src/features/tracking/components/TrackingMap.tsx`
- `src/features/services/components/CourierServiceMap.tsx`

---

### CAMBIO-54 — Variable de entorno `EXPO_PUBLIC_MAPTILER_KEY` en `.env`

**Problema:** El `.env` tenía `EXPO_PUBLIC_MAPTILER_KEY= FzRXuyfOiBQoREHvTQxb` con un espacio extra antes del valor. Algunos parsers de dotenv incluyen el espacio en el string, lo que causaría que la key llegara como ` FzRXuyfOiBQoREHvTQxb` a Maptiler (403).

**Solución:** Corregido el `.env` eliminando el espacio:

```dotenv
EXPO_PUBLIC_MAPTILER_KEY=FzRXuyfOiBQoREHvTQxb
```

El prefijo `EXPO_PUBLIC_` es obligatorio — Metro elimina del bundle del cliente cualquier variable sin ese prefijo por seguridad.

**Archivos modificados:**
- `.env`

---

### CAMBIO-55 — `postMessage` para actualizar marcador sin reload del WebView

**Problema:** `TrackingMap` reconstruía el HTML completo de Leaflet cada vez que cambiaban las coordenadas (cada 15s), causando que el WebView se recargara entero. Esto producía un parpadeo visible en el mapa en cada actualización de posición.

**Causa raíz:** `useMemo` tenía `[latitude, longitude]` como dependencias, recalculando el HTML en cada tick del GPS.

**Solución:**

1. El HTML se construye **una sola vez** usando las coordenadas iniciales (guardadas en `useRef`)
2. Las actualizaciones posteriores se envían via `webViewRef.current.postMessage()`
3. El JS dentro del WebView escucha el mensaje y llama `marker.setLatLng()` + `map.panTo()` — sin reload

```typescript
// React Native → WebView
webViewRef.current.postMessage(JSON.stringify({ lat: latitude, lng: longitude }));

// Dentro del HTML de Leaflet
document.addEventListener('message', handleMessage);  // Android
window.addEventListener('message', handleMessage);    // iOS

function handleMessage(event) {
  var data = JSON.parse(event.data);
  marker.setLatLng([data.lat, data.lng]);
  map.panTo([data.lat, data.lng]);
}
```

El mismo patrón ya existía en `CourierServiceMap` para el pin del courier — se aplicó consistentemente a `TrackingMap`.

**Archivos modificados:**
- `src/features/tracking/components/TrackingMap.tsx`

---

### CAMBIO-56 — `useTrackingStore` — store compartido de coordenadas GPS

**Problema:** `useLocation` se llama en `TrackingScreen` (siempre montado como tab) y también se llamaba en `ServiceDetailScreen`. Dos instancias del hook = dos foreground intervals de 15s = el backend recibe el doble de requests de ubicación.

**Solución:** Creado `src/features/tracking/store/trackingStore.ts` — Zustand store que actúa como canal de comunicación entre el hook y los consumidores:

```typescript
interface TrackingState {
  latitude: number | null;
  longitude: number | null;
  permissionDenied: boolean;
  setCoords: (lat: number, lng: number) => void;
  setPermissionDenied: (denied: boolean) => void;
  clearCoords: () => void;
}
```

`useLocation` escribe en el store en cada ciclo. Los componentes que solo necesitan leer las coords usan `useTrackingCoords()` — hook de solo lectura exportado desde `useLocation.ts`.

**Archivos creados:**
- `src/features/tracking/store/trackingStore.ts`

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-57 — `useTrackingCoords()` — hook de solo lectura

**Problema:** `ServiceDetailScreen` necesitaba las coords del courier para pasarlas a `CourierServiceMap`, pero no debía iniciar un segundo interval de tracking.

**Solución:** Exportado `useTrackingCoords()` desde `useLocation.ts`:

```typescript
// Solo lectura — no inicia tracking, no crea intervals
export function useTrackingCoords(): LocationState {
  const latitude = useTrackingStore((s) => s.latitude);
  const longitude = useTrackingStore((s) => s.longitude);
  const permissionDenied = useTrackingStore((s) => s.permissionDenied);
  return { latitude, longitude, permissionDenied };
}
```

`ServiceDetailScreen` reemplazó `useLocation({ active: ... })` por `useTrackingCoords()`.

**Archivos modificados:**
- `src/features/tracking/hooks/useLocation.ts`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-58 — `TrackingScreen` con visualización de origen y destino del servicio activo

**Problema:** `TrackingScreen` solo mostraba la posición del mensajero (un marcador azul). El mensajero no podía ver en el tab de mapa hacia dónde iba ni de dónde recogía el paquete.

**Solución:** `TrackingScreen` ahora detecta el servicio activo (`ACCEPTED` o `IN_TRANSIT`) desde `useServicesStore` y, si tiene coordenadas geocodificadas, renderiza `CourierServiceMap` en modo `fullScreen` con los tres pins:

```
operationalStatus !== 'IN_SERVICE'  →  "Sin ruta activa"
IN_SERVICE, sin geocoords           →  "Coordenadas no disponibles"
IN_SERVICE + geocoords              →  CourierServiceMap fullScreen
```

El servicio activo se lee directamente del store (ya hidratado por `useDashboard`/`useServices`) — sin fetch adicional.

**Archivos modificados:**
- `src/features/tracking/screens/TrackingScreen.tsx`

---

### CAMBIO-59 — Prop `fullScreen` en `CourierServiceMap`

**Problema:** `CourierServiceMap` tenía altura fija de 260px y bordes redondeados, diseñado para usarse dentro del scroll de `ServiceDetailScreen`. En `TrackingScreen` necesitaba ocupar toda la pantalla.

**Solución:** Agregada prop `fullScreen?: boolean`. Cuando es `true`, el contenedor usa `flex: 1` sin altura fija, sin bordes redondeados y sin margen:

```typescript
containerFullScreen: {
  height: undefined,
  flex: 1,
  borderRadius: 0,
  borderWidth: 0,
  marginVertical: 0,
},
```

La lógica del mapa (HTML builder, postMessage, markers) no se modifica.

**Archivos modificados:**
- `src/features/services/components/CourierServiceMap.tsx`

---

### CAMBIO-60 — Tab "Mapa" agregado al TabNavigator

**Problema:** `TrackingScreen` existía como archivo pero no estaba conectado a la navegación. No había forma de acceder al mapa desde la app.

**Solución:** Agregado tab `Tracking` al `TabNavigator` entre `Orders` y `Earnings`:

```typescript
export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Tracking: undefined;   // ← nuevo
  Earnings: undefined;
  Config: undefined;
};
```

Ícono: `📍` (activo) / `🗺️` (inactivo). Título: `Mapa`.

**Archivos modificados:**
- `src/app/navigation/TabNavigator.tsx`

---

### Resumen de cambios

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-52 | Tiles OSM → Maptiler | Tiles confiables para uso comercial |
| CAMBIO-53 | `src/config/map.ts` — fuente única de la API key | Sin duplicación, warning en dev si falta la key |
| CAMBIO-54 | `.env` corregido (espacio extra eliminado) | Key llega correctamente a Maptiler |
| CAMBIO-55 | `postMessage` para actualizar marcador | Sin parpadeo en cada tick de 15s |
| CAMBIO-56 | `useTrackingStore` — store compartido de coords | Sin doble interval de tracking |
| CAMBIO-57 | `useTrackingCoords()` — hook read-only | `ServiceDetailScreen` lee coords sin iniciar tracking |
| CAMBIO-58 | `TrackingScreen` muestra origen + destino del servicio | Mensajero ve la ruta completa en el tab de mapa |
| CAMBIO-59 | Prop `fullScreen` en `CourierServiceMap` | Mismo componente en dos contextos visuales distintos |
| CAMBIO-60 | Tab "Mapa" en `TabNavigator` | `TrackingScreen` accesible desde la navegación |

---

### Bugs corregidos

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-32 | Tiles OSM bloqueables en producción | Mapa sin tiles con muchos mensajeros | Migración a Maptiler |
| BUG-33 | `MAPTILER_KEY` hardcodeado como placeholder | 403 en todos los tiles | `src/config/map.ts` + `.env` |
| BUG-34 | Espacio extra en `.env` antes del valor | Key inválida enviada a Maptiler | `.env` corregido |
| BUG-35 | WebView recargaba entero cada 15s | Parpadeo visible en el mapa | `postMessage` + `marker.setLatLng()` |
| BUG-36 | Doble interval de tracking (dos instancias de `useLocation`) | Doble envío de ubicación al backend | `useTrackingStore` + `useTrackingCoords` |
| BUG-37 | `TrackingScreen` sin origen/destino del servicio | Mensajero no veía la ruta en el tab de mapa | `CourierServiceMap fullScreen` con servicio activo |
| BUG-38 | `TrackingScreen` no conectado al navegador | Tab de mapa inaccesible | Tab `Tracking` en `TabNavigator` |

---

*Actualización: 14 de abril de 2026 — Maptiler + TrackingScreen v2.0*

---

## Sesión 1 de Mayo de 2026 — Background Tracking, Permisos, OSM, Teléfono de Cliente

### Contexto

Se realizaron mejoras en cinco áreas: tracking de ubicación en segundo plano durante toda la jornada, solicitud automática de permisos al abrir la app, migración de tiles de mapa de Maptiler a OpenStreetMap, identidad visual del APK, y contacto telefónico del cliente en las cards de servicio.

---

### CAMBIO-61 — Background tracking durante toda la jornada (no solo IN_SERVICE)

**Problema:** El task de ubicación en segundo plano (`tracking-background-location`) solo se iniciaba cuando el mensajero tenía un servicio `IN_SERVICE`. Si la app se cerraba mientras el mensajero estaba `AVAILABLE` (esperando servicios), no se enviaba ninguna ubicación al backend.

**Causa raíz:** `useLocation` arrancaba el background task condicionado a `operationalStatus === 'IN_SERVICE'`, y ese hook vive en `TrackingScreen` (un tab). Si el tab no estaba montado o la app estaba en background, el intervalo de foreground moría.

**Solución:** Se creó un segundo background task (`workday-background-location`) que corre durante toda la jornada laboral, independientemente de si hay un servicio activo:

- `workdayBackgroundTask.ts` — define el task con `TaskManager.defineTask`. Envía ubicación cada 15s usando `sendFromBackground()` (lee JWT de SecureStore). Se detiene automáticamente si recibe 401 (sesión expirada).
- `useWorkdayTracking.ts` — hook que encapsula `startLocationUpdatesAsync` / `stopLocationUpdatesAsync` para el task de jornada.
- `useWorkday.ts` — ahora llama `startWorkdayTracking()` al iniciar jornada y `stopWorkdayTracking()` al terminarla.
- `index.ts` — registra el nuevo task antes de que monte React.
- `useSessionRestore.ts` — si el mensajero ya estaba en jornada (`AVAILABLE` o `IN_SERVICE`) cuando abre la app, llama `restoreWorkdayTracking()` para reiniciar el task si el OS lo mató.

**Notificación persistente (Android):**
```
Título: "Jornada activa"
Cuerpo: "Tu ubicación se comparte mientras estás en jornada."
```

**Archivos creados:**
- `src/features/tracking/tasks/workdayBackgroundTask.ts`
- `src/features/tracking/hooks/useWorkdayTracking.ts`

**Archivos modificados:**
- `src/features/workday/hooks/useWorkday.ts`
- `src/core/hooks/useSessionRestore.ts`
- `index.ts`

---

### CAMBIO-62 — Solicitud automática de permisos al abrir la app

**Problema:** La app no pedía permisos de ubicación ni cámara al primer arranque. El usuario tenía que otorgarlos manualmente desde los ajustes del sistema.

**Causa raíz:** `usePermissions` tenía `if (!user) return` en el efecto — solo pedía permisos si había sesión activa. En el primer arranque, `user` es `null` y el efecto nunca corría.

**Solución:** Se reescribió `usePermissions`:
- Eliminada la condición `!user` — los permisos se piden al montar la app sin importar si hay sesión.
- Añadido `requestBackgroundPermissionsAsync` (faltaba — necesario para el task de jornada).
- Cambiado `useState` por `useRef` para el guard de doble ejecución (no necesita re-render).
- Orden correcto: foreground location → background location → cámara (Android requiere foreground antes de background).

**Archivos modificados:**
- `src/core/hooks/usePermissions.ts`

---

### CAMBIO-63 — Migración de tiles de mapa: Maptiler → OpenStreetMap

**Problema:** Los archivos `CourierServiceMap.tsx` y `TrackingMap.tsx` seguían usando tiles de Maptiler (`api.maptiler.com`) a pesar de que el documento `maptiler-to-osm-migration.md` describía la migración como completada. El costo era $858.89/mes.

**Causa raíz:** El documento era aspiracional — los archivos reales nunca fueron actualizados.

**Solución:** Aplicada la migración en ambos componentes:
- URL cambiada de `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=...` a `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Eliminado `import { MAPTILER_KEY } from '@/config/map'` en ambos archivos.
- Eliminado el parámetro `maptilerKey` de las funciones `buildServiceMapHtml` y `buildLeafletHtml`.
- Añadida la atribución requerida por OSM (oculta visualmente con CSS pero presente en el HTML).
- Eliminado el plugin duplicado `expo-secure-store` en `app.json`.

**Costo después:** $0/mes.

**Archivos modificados:**
- `src/features/services/components/CourierServiceMap.tsx`
- `src/features/tracking/components/TrackingMap.tsx`

---

### CAMBIO-64 — Identidad visual del APK (nombre e ícono)

**Problema:** El APK generado mostraba el nombre `courier-mobile-app` y el ícono default de Expo (lambda azul) en el launcher del dispositivo.

**Causa raíz:** `app.json` tenía `"name": "courier-mobile-app"` y `"icon": "./assets/icon.png"` (ícono default). El `logo.png` existía en assets pero no estaba referenciado.

**Solución:**
- `"name"` → `"TracKing"`
- `"icon"` → `"./assets/logo.png"`
- `"splash.image"` → `"./assets/logo.png"`
- `"android.adaptiveIcon.foregroundImage"` → `"./assets/logo.png"` con `"backgroundColor": "#ffffff"`
- Eliminadas las referencias a `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png` del adaptive icon.

**Nota:** Requiere rebuild del APK para que los cambios se reflejen. Un reload de Expo Go no actualiza el ícono ni el nombre.

**Archivos modificados:**
- `app.json`

---

### CAMBIO-65 — Teléfono del cliente con acciones rápidas en cards de servicio

**Problema:** Las cards de servicio no mostraban el teléfono del cliente. El botón 📞 en `ServiceCard` existía pero no hacía nada. El mensajero no tenía forma de contactar al cliente desde la app.

**Causa raíz:** El campo `destination_contact_number` no estaba en el tipo `Service` ni era devuelto/mostrado en ningún componente.

**Solución:**

1. **Tipo `Service`** — añadido `destination_contact_number?: string`.

2. **`PhoneActions.tsx`** (componente nuevo) — tres botones de acción para un número de teléfono:
   - 📋 **Copiar** — `Clipboard.setString()` con confirmación via `Alert`
   - 📞 **Llamar** — `Linking.openURL('tel:...')`
   - 💬 **WhatsApp** — `Linking.openURL('https://wa.me/...')` (dígitos limpios sin `+`)
   - Normaliza el número antes de construir URLs (elimina espacios, guiones, paréntesis).

3. **`ServiceCard.tsx`** — el botón 📞 ahora está en el `topRow` (esquina superior derecha, `marginLeft: 'auto'`). Al tocarlo abre un bottom sheet modal con el nombre del cliente y los tres botones. Solo aparece si el servicio tiene `destination_contact_number`.

4. **`ActiveServiceCard.tsx`** (dashboard) — mismo botón 📞 en el `topRow`, mismo modal. `e.stopPropagation()` evita que el tap en el botón navegue al detalle del servicio.

5. **`ServiceDetailScreen.tsx`** — en la sección de ruta, debajo de "Destinatario", se muestran el número y los tres botones cuando el campo está disponible.

**Archivos creados:**
- `src/features/services/components/PhoneActions.tsx`

**Archivos modificados:**
- `src/features/services/types/services.types.ts`
- `src/features/services/components/ServiceCard.tsx`
- `src/features/dashboard/components/ActiveServiceCard.tsx`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-66 — Corrección de bugs preexistentes en tests

**Problema 1 — `useDashboard`:** `activeService` incluía servicios con estado `ASSIGNED` en su filtro (`ASSIGNED || ACCEPTED || IN_TRANSIT`). Los tests esperaban correctamente que `ASSIGNED` no fuera un servicio activo — `ASSIGNED` significa asignado pero no aceptado aún por el mensajero.

**Solución:** Filtro corregido a solo `ACCEPTED || IN_TRANSIT`.

**Problema 2 — `fcm.service.test.ts`:** El mock de `@react-native-firebase/messaging` en `jest.setup.js` usaba `module.exports = messaging` sin exponer `.default`. `fcm.service.ts` hace `require(...).default` para lazy-load Firebase, obteniendo `undefined`.

**Solución:** Añadido `messaging.default = messaging` al mock para que `require(...).default` retorne la función mock correctamente.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`
- `jest.setup.js`

---

### CAMBIO-67 — Instalación de dependencias web

**Dependencias instaladas** para soporte de vista web (`expo start --web`):
- `react-dom@19.2.0`
- `react-native-web@0.21.0`

---

### Resumen de cambios

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-61 | Background tracking durante toda la jornada | Ubicación enviada aunque la app esté cerrada |
| CAMBIO-62 | Permisos solicitados al abrir la app | No más configuración manual en ajustes |
| CAMBIO-63 | Tiles OSM (Maptiler eliminado) | $858.89/mes → $0/mes |
| CAMBIO-64 | Nombre "TracKing" e ícono del logo en APK | Identidad visual correcta en el launcher |
| CAMBIO-65 | Teléfono del cliente con copiar/llamar/WhatsApp | Mensajero puede contactar al cliente desde la card |
| CAMBIO-66 | Bugs preexistentes en tests corregidos | 20/20 suites, 212/212 tests pasando |
| CAMBIO-67 | react-dom + react-native-web instalados | Soporte para `expo start --web` |

---

### Bugs corregidos

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-39 | Background task solo activo en IN_SERVICE | Sin ubicación cuando app cerrada en AVAILABLE | Nuevo task `workday-background-location` |
| BUG-40 | Permisos nunca solicitados en primer arranque | Usuario debía otorgarlos manualmente | `usePermissions` sin condición de sesión |
| BUG-41 | `requestBackgroundPermissionsAsync` faltaba en permisos | Task de jornada sin permiso de background | Añadido al flujo de permisos |
| BUG-42 | Tiles Maptiler en producción ($858/mes) | Costo innecesario | Migración a OSM |
| BUG-43 | APK con nombre `courier-mobile-app` e ícono default | Identidad visual incorrecta | `app.json` actualizado |
| BUG-44 | Botón 📞 en ServiceCard no hacía nada | Mensajero sin forma de contactar al cliente | `PhoneActions` + modal |
| BUG-45 | `activeService` incluía ASSIGNED incorrectamente | KPI y lógica de servicio activo erróneos | Filtro corregido a ACCEPTED/IN_TRANSIT |
| BUG-46 | Mock de Firebase sin `.default` | 13 tests de FCM fallando | `messaging.default = messaging` en mock |

---

*Actualización: 1 de Mayo de 2026 — Background Tracking + Permisos + OSM + Identidad APK + Teléfono Cliente*

---

## Sesión 1 de Mayo de 2026 (continuación) — Navegación, Contactos, Dashboard

### Contexto

Segunda parte de la sesión del 1 de Mayo. Se realizaron mejoras en navegación externa (Google Maps / Waze), contactos de servicio con menú hamburguesa, eliminación del tab de mapa, y visualización de todos los servicios activos en el dashboard.

---

### CAMBIO-68 — Botones de navegación externa en el mapa del servicio

**Problema:** El mensajero no tenía forma de abrir la ruta en una app de navegación externa desde el mapa del servicio.

**Solución:** Se añadieron dos botones superpuestos en la esquina superior derecha del mapa (`CourierServiceMap`), visibles tanto en el modo 260px del detalle como en pantalla completa:

- **🗺️ Maps** → `https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&travelmode=driving`
- **🚗 Waze** → `https://waze.com/ul?ll=DEST_LAT,DEST_LNG&navigate=yes`

Si la app nativa está instalada, el OS la abre directamente. Si no, abre el navegador. Waze solo soporta destino final en su deep link público (sin waypoints intermedios).

Los botones usan `position: 'absolute'` con sombra ligera para ser legibles sobre cualquier tile del mapa.

**Archivos modificados:**
- `src/features/services/components/CourierServiceMap.tsx`

---

### CAMBIO-69 — Eliminación del tab "Mapa" y TrackingScreen

**Problema:** El tab "Mapa" (`TrackingScreen`) era redundante — el mapa del servicio ya está disponible en `ServiceDetailScreen` y los botones de navegación externa cubren el caso de uso principal. Además, `TrackingScreen` era el dueño del ciclo de vida del tracking de foreground, lo que requería mantener el tab montado.

**Solución:**
- `TrackingScreen.tsx` eliminado.
- Tab `Tracking` eliminado de `TabNavigator`. La barra inferior queda con 4 tabs: Inicio, Servicios, Reportes, Config.
- `useLocation({ active: isInService })` movido a `HomeScreen` — siempre montado como primer tab, garantiza que el ciclo de vida del tracking de foreground siga funcionando.

**Archivos eliminados:**
- `src/features/tracking/screens/TrackingScreen.tsx`

**Archivos modificados:**
- `src/app/navigation/TabNavigator.tsx`
- `src/features/dashboard/screens/HomeScreen.tsx`

---

### CAMBIO-70 — Botón "Navegar" eliminado de ServiceCard

**Problema:** El botón "Navegar" en la card de servicio activo (`ACCEPTED`/`IN_TRANSIT`) llamaba `onPress` — exactamente lo mismo que tocar la card entera. Era completamente redundante.

**Solución:** Botón eliminado. La navegación al detalle se hace tocando la card. Los botones de Google Maps y Waze están disponibles dentro del mapa en `ServiceDetailScreen`.

**Archivos modificados:**
- `src/features/services/components/ServiceCard.tsx`

---

### CAMBIO-71 — Menú de contactos con hamburguesa (dos teléfonos por servicio)

**Problema:** El botón 📞 anterior solo mostraba el teléfono de quien recibe el paquete (`destination_contact_number`). No había forma de contactar al cliente que hizo el pedido, ni distinción visual entre los dos contactos.

**Solución completa:**

1. **Tipo `Service`** — añadido `origin_contact_phone?: string` (teléfono del cliente que hizo el pedido).

2. **`ContactsMenu.tsx`** (componente nuevo) — botón hamburguesa `☰` que abre un bottom sheet con dos secciones diferenciadas:
   - **👤 Cliente** — quien hizo el pedido (`origin_contact_phone`)
   - **📦 Quien recibe** — quien recibe el paquete (`destination_contact_number`)
   
   Cada sección muestra nombre, número y los tres botones de `PhoneActions` (📋 Copiar / 📞 Llamar / 💬 WhatsApp). Si solo hay un teléfono disponible, solo aparece esa sección. Si no hay ninguno, el botón no se renderiza. Prop `stopPropagation` para evitar que el tap burbujee al card padre.

3. **`ServiceCard`** — reemplazado el botón 📞 y el `PhoneModal` con `ContactsMenu` en el `topRow` (esquina superior derecha).

4. **`ActiveServiceCard`** — mismo reemplazo. Se eliminó el `Modal` inline y la dependencia de `PhoneActions` directa.

5. **`ServiceDetailScreen`** — en la sección de ruta, fila "Contactos" con el `ContactsMenu` cuando hay al menos un teléfono disponible.

**Archivos creados:**
- `src/features/services/components/ContactsMenu.tsx`

**Archivos modificados:**
- `src/features/services/types/services.types.ts`
- `src/features/services/components/ServiceCard.tsx`
- `src/features/dashboard/components/ActiveServiceCard.tsx`
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### CAMBIO-72 — Dashboard muestra todos los servicios activos

**Problema:** El dashboard solo mostraba un único `activeService` (el primero en estado `ACCEPTED` o `IN_TRANSIT`). Los servicios `ASSIGNED` y los demás servicios activos no aparecían.

**Causa raíz:** `useDashboard` usaba `.find()` en lugar de `.filter()`, y solo buscaba `ACCEPTED | IN_TRANSIT`.

**Solución:**
- `useDashboard` ahora expone `activeServices: Service[]` (array) en lugar de `activeService: Service | null`.
- Filtra por `ASSIGNED | ACCEPTED | IN_TRANSIT` — todos los servicios que el mensajero necesita atender.
- `HomeScreen` renderiza la lista completa con un título "Servicios activos (N)" y un `map()` de `ActiveServiceCard`.
- El empty state dice "Sin servicios activos" cuando el array está vacío.

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`
- `src/features/dashboard/screens/HomeScreen.tsx`
- `src/__tests__/dashboard/useDashboard.test.ts` — tests actualizados de `activeService` → `activeServices` con 5 casos nuevos

---

### Resumen de cambios

| ID | Cambio | Impacto |
|---|---|---|
| CAMBIO-68 | Botones Google Maps + Waze en el mapa | Navegación externa desde el mapa del servicio |
| CAMBIO-69 | Tab "Mapa" eliminado, tracking movido a HomeScreen | UI más limpia, tracking sigue funcionando |
| CAMBIO-70 | Botón "Navegar" redundante eliminado | Menos ruido en la card |
| CAMBIO-71 | Menú hamburguesa con dos contactos (cliente + receptor) | Mensajero puede contactar a ambas partes |
| CAMBIO-72 | Dashboard muestra todos los servicios activos | Visibilidad completa de la carga del día |

---

### Bugs corregidos

| ID | Problema | Impacto | Resolución |
|---|---|---|---|
| BUG-47 | Solo un servicio visible en dashboard | Mensajero no veía todos sus pedidos del día | `activeServices[]` con filter en lugar de find |
| BUG-48 | Sin teléfono del cliente en el servicio | Solo se podía contactar a quien recibe | `origin_contact_phone` añadido al tipo y UI |
| BUG-49 | Botón "Navegar" hacía lo mismo que tocar la card | UX confusa | Eliminado |
| BUG-50 | Tab "Mapa" redundante con 5 tabs en la barra | Navegación innecesariamente compleja | Tab eliminado, 4 tabs restantes |

---

*Actualización: 1 de Mayo de 2026 (tarde) — Navegación externa + Contactos + Dashboard multi-servicio*

---

## 9. Implementación de WebSocket — Tiempo Real Completo (Mayo 2026)

### Contexto

Se completó la implementación de WebSocket para cubrir todos los módulos del mobile que requieren actualizaciones en tiempo real. La base (`wsClient.ts`, `useServiceUpdates.ts`) ya existía y funcionaba para el módulo de servicios. Esta sesión extendió el sistema a dashboard, earnings, y agregó observabilidad del estado de conexión.

---

### CAMBIO-73 — `wsClient`: estado de conexión observable

**Problema:** No había forma de saber desde la UI si el WebSocket estaba conectado, reconectando o desconectado. El estado era interno a la clase y no se podía suscribir.

**Solución:** Se agregaron tres elementos a `ServiceWebSocketClient`:

- `status` getter — retorna el estado actual (`'connected' | 'disconnected' | 'reconnecting'`)
- `onStatusChange(handler)` — registra un listener que se llama cada vez que el estado cambia. Retorna función de unsubscribe.
- `_setStatus(status)` — método privado que actualiza el estado y notifica a todos los listeners. Incluye guard de no-duplicados (no dispara si el estado no cambió).

**Transiciones de estado:**
```
initial                → disconnected
SIO namespace connect  → connected
abnormal close / error → reconnecting
max retries exhausted  → disconnected
manual disconnect()    → disconnected
```

**Archivos modificados:**
- `src/core/api/wsClient.ts`

---

### CAMBIO-74 — `useWsStatus`: hook reactivo de estado de conexión

**Problema:** Los componentes no podían leer el estado de conexión del WS de forma reactiva.

**Solución:** Hook nuevo que inicializa su estado con `wsClient.status` y se suscribe a `onStatusChange` para re-renderizar cuando el estado cambia. Se desuscribe automáticamente en unmount.

**Archivos creados:**
- `src/core/hooks/useWsStatus.ts`

---

### CAMBIO-75 — `WsStatusDot`: indicador visual de conexión

**Solución:** Componente nuevo que muestra un punto de 8px con color según el estado:

| Estado | Color |
|--------|-------|
| `connected` | `#22c55e` (verde) |
| `reconnecting` | `#f59e0b` (ámbar) |
| `disconnected` | `#ef4444` (rojo) |

Listo para usar en cualquier pantalla o header.

**Archivos creados:**
- `src/shared/components/WsStatusDot.tsx`

---

### CAMBIO-76 — `useDashboardUpdates`: dashboard reactivo a nuevos servicios

**Problema:** El dashboard no se actualizaba cuando el backend asignaba un nuevo servicio al courier. El mensajero tenía que hacer pull-to-refresh manualmente para ver el nuevo pedido en sus KPIs.

**Causa raíz:** `useDashboard` no escuchaba eventos WebSocket.

**Solución:** Hook nuevo `useDashboardUpdates(onRefresh)` que escucha el evento `service:assigned` en el `wsClient` (ya conectado por `useServiceUpdates`) y llama `onRefresh()` para re-fetch del dashboard.

El evento `service:updated` no requiere re-fetch porque los KPIs se recalculan automáticamente desde `servicesStore`, que ya está sincronizado por `useServiceUpdates`.

**Integración:** `useDashboard` llama `useDashboardUpdates(refresh)` internamente.

**Archivos creados:**
- `src/features/dashboard/hooks/useDashboardUpdates.ts`

**Archivos modificados:**
- `src/features/dashboard/hooks/useDashboard.ts`

---

### CAMBIO-77 — `useEarningsUpdates`: ganancias reactivas a nuevas liquidaciones

**Problema:** La pantalla de ganancias no se actualizaba cuando el admin generaba una nueva liquidación para el courier. El mensajero tenía que hacer pull-to-refresh manualmente.

**Solución:** Hook nuevo `useEarningsUpdates()` que escucha el evento `settlement:created` en el `wsClient` e invalida el cache de React Query `['courier-earnings']`, forzando un re-fetch automático.

**Integración:** `useEarnings` llama `useEarningsUpdates()` internamente.

**Archivos creados:**
- `src/features/earnings/hooks/useEarningsUpdates.ts`

**Archivos modificados:**
- `src/features/earnings/hooks/useEarnings.ts`

---

### CAMBIO-78 — Backend: `emitSettlementCreated` en `ServiceUpdatesGateway`

**Problema:** El gateway `/services` no tenía método para emitir el evento `settlement:created`.

**Solución:** Se agregó `emitSettlementCreated(courierId, settlement)` al `ServiceUpdatesGateway`. Emite al room `courier:<courierId>` con el payload de la liquidación creada.

**Archivos modificados:**
- `TracKing-backend/src/modules/servicios/services-updates.gateway.ts`

---

### CAMBIO-79 — Backend: `GenerarLiquidacionCourierUseCase` emite WS al crear liquidación

**Problema:** Al generar una liquidación, el courier no recibía ninguna notificación en tiempo real.

**Solución:** `GenerarLiquidacionCourierUseCase` ahora inyecta `ServiceUpdatesGateway` y llama `emitSettlementCreated()` al final del flujo, después de crear la liquidación y marcar los servicios como liquidados.

El payload emitido incluye: `id`, `total_earned`, `total_services`, `start_date`, `end_date`, `status`.

**Dependencia de módulo:** `LiquidacionesModule` importa `ServiciosModule` para acceder al gateway exportado.

**Archivos modificados:**
- `TracKing-backend/src/modules/liquidaciones/application/use-cases/generar-liquidacion-courier.use-case.ts`
- `TracKing-backend/src/modules/liquidaciones/liquidaciones.module.ts`

---

### Resumen de cambios

| ID | Cambio | Módulo |
|---|---|---|
| CAMBIO-73 | `wsClient` — estado observable (`onStatusChange`, `status`) | Mobile — core |
| CAMBIO-74 | `useWsStatus` — hook reactivo de estado de conexión | Mobile — core |
| CAMBIO-75 | `WsStatusDot` — indicador visual verde/ámbar/rojo | Mobile — shared |
| CAMBIO-76 | `useDashboardUpdates` — dashboard reactivo a `service:assigned` | Mobile — dashboard |
| CAMBIO-77 | `useEarningsUpdates` — earnings reactivo a `settlement:created` | Mobile — earnings |
| CAMBIO-78 | `emitSettlementCreated` en `ServiceUpdatesGateway` | Backend — servicios |
| CAMBIO-79 | `GenerarLiquidacionCourierUseCase` emite WS al crear liquidación | Backend — liquidaciones |

---

### Arquitectura final de tiempo real

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
│                                                             │
│  useServices()          useDashboard()      useEarnings()   │
│    └─ useServiceUpdates   └─ useDashboard     └─ useEarnings│
│         │                     Updates()           Updates() │
│         │                         │                   │     │
│  ┌──────▼─────────────────────────▼───────────────────▼──┐  │
│  │              wsClient (singleton /services)            │  │
│  │  on('service:updated')  → updateService + setQueryData │  │
│  │  on('service:assigned') → addService + refresh KPIs   │  │
│  │  on('settlement:created') → invalidate earnings cache  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ wss://.../services
┌─────────────────────────▼───────────────────────────────────┐
│  NestJS — ServiceUpdatesGateway (/services namespace)        │
│  emitServiceUpdate()      → service:updated                  │
│  emitServiceAssigned()    → service:assigned                 │
│  emitSettlementCreated()  → settlement:created  ← NEW        │
└─────────────────────────────────────────────────────────────┘
```

### Tests agregados

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `src/__tests__/core/wsClient.status.spec.ts` | 11 | Estado inicial, transiciones, múltiples listeners, unsubscribe, no-duplicados |
| `src/__tests__/core/useWsStatus.test.ts` | 7 | Hook reactivo, unsubscribe en unmount |
| `src/__tests__/dashboard/useDashboardUpdates.test.ts` | 7 | Registro de listener, onRefresh en service:assigned, sin token, unsubscribe |
| `src/__tests__/earnings/useEarningsUpdates.test.ts` | 5 | Invalidación de cache, eventos no relacionados, múltiples eventos, unsubscribe |

Suite completa: **243 tests, todos pasan.**

---

*Actualización: 5 de Mayo de 2026 — WebSocket completo: dashboard + earnings + observabilidad de conexión*

---

## 10. Iconos minimalistas + navegación del detalle (Mayo 2026)

### CAMBIO-80 — Iconos: emojis reemplazados por Ionicons (opción A)

**Problema:** Los iconos de la app eran emojis (`🏍️`, `📦`, `💰`, `📋`, etc.). El renderizado de emojis varía entre dispositivos Android/iOS, no respetan el tema oscuro/claro, y no tienen contraste controlado con los colores de la app.

**Solución:** Se reemplazaron todos los emojis por `Ionicons` de `@expo/vector-icons` (incluido en Expo, sin instalación extra). Estilo **outline → filled** al activarse. Colores:
- Activo: `primary` (`#1D4ED8` light / `#60A5FA` dark)
- Inactivo: `neutral400` (`#9CA3AF`)

**Archivos modificados:**

| Archivo | Cambio |
|---------|--------|
| `src/app/navigation/TabNavigator.tsx` | Emojis → Ionicons en tabs (home, cube, bar-chart, time) |
| `src/features/dashboard/components/KPIBox.tsx` | Prop `icon: string` → `iconName: keyof Ionicons.glyphMap` |
| `src/features/dashboard/screens/HomeScreen.tsx` | KPIBox con `clipboard-outline` y `bicycle-outline`; empty state con `cube-outline` |
| `src/features/services/screens/ServicesScreen.tsx` | Menú dropdown con `checkmark-circle-outline` y `time-outline`; empty state con `cube-outline` |
| `src/features/services/screens/ServiceHistoryScreen.tsx` | Empty state con `time-outline` |
| `src/features/services/components/CourierServiceMap.tsx` | Botones Maps/Waze con `map-outline` y `navigate-outline` |
| `src/features/services/components/ContactsMenu.tsx` | Secciones con `person-outline` y `cube-outline` |
| `src/features/services/components/PhoneActions.tsx` | Botones con `copy-outline`, `call-outline`, `logo-whatsapp` |
| `src/features/earnings/screens/EarningsScreen.tsx` | KPI chips con `receipt-outline`, `bicycle-outline`, `wallet-outline`; incentivos con `trophy-outline`; empty con `bar-chart-outline` |
| `src/features/earnings/components/SettlementDetailModal.tsx` | Meta con `location-outline` y `person-outline`; error con `warning-outline`; empty con `cube-outline` |
| `src/features/workday/screens/WorkdayScreen.tsx` | Tema con `moon-outline`/`sunny-outline`; mapa con `map-outline` |
| `src/features/auth/screens/LoginScreen.tsx` | Input icons con `person-outline`, `eye-outline`, `eye-off-outline` |

---

### CAMBIO-81 — ServiceDetailScreen: back navega siempre a ServicesList

**Problema:** Al presionar el botón de back en el detalle de un servicio, `navigation.goBack()` regresaba a la pantalla anterior en el historial del stack. Si el courier llegó al detalle desde el dashboard (tocando una `ActiveServiceCard`), el back lo devolvía al dashboard en lugar de a la lista de servicios.

**Causa raíz:** `goBack()` es dependiente del historial de navegación. El comportamiento correcto (ir a servicios) solo ocurría por casualidad cuando se llegaba desde `ServicesScreen`.

**Solución:** Cambiado a `navigation.navigate('ServicesList')`. Siempre aterriza en `ServicesScreen` sin importar el origen. El tipo de navegación se actualizó a `NativeStackNavigationProp<ServicesStackParamList>` para tipado correcto.

**Archivos modificados:**
- `src/features/services/screens/ServiceDetailScreen.tsx`

---

### Tests agregados

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `src/__tests__/services/serviceDetailNavigation.test.ts` | 6 | navigate vs goBack, destino siempre ServicesList, independencia del origen |
| `TracKing-backend/src/tests/unit/liquidaciones/generar-liquidacion-courier-ws.use-case.spec.ts` | 10 | emitSettlementCreated llamado correctamente, payload completo, no emite en errores, total_earned como número |

**Test corregido:**
- `TracKing-backend/src/tests/unit/liquidaciones/generar-liquidacion-courier.use-case.spec.ts` — actualizado para pasar el `mockGateway` como 4to argumento del constructor (requerido tras CAMBIO-79).

Suite mobile: **249 tests, todos pasan.**

---

*Actualización: 5 de Mayo de 2026 (noche) — Iconos Ionicons + navegación ServiceDetail*
