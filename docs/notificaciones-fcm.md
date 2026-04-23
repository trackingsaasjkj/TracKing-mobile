# Notificaciones Push — FCM (App Móvil)

Implementación de Firebase Cloud Messaging en la app móvil de mensajeros.

## Stack

- `@react-native-firebase/app` — SDK base de Firebase
- `@react-native-firebase/messaging` — FCM para notificaciones push
- EAS Build — para generar APK/AAB con código nativo

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/core/notifications/fcm.service.ts` | Funciones puras: permisos, token, listeners |
| `src/core/notifications/useFCM.ts` | Hook principal, se monta en AppProviders |
| `index.ts` | Registra el background message handler antes del árbol React |
| `app.json` | Plugin de Firebase + `googleServicesFile` configurado |
| `eas.json` | Perfiles de build: development (APK), preview (APK), production (AAB) |
| `google-services.json` | Credenciales Firebase para Android (NO commitear) |

## Flujo de inicialización

```
App arranca
  └── index.ts → setBackgroundMessageHandler() registrado

Usuario se autentica
  └── AppProviders monta useFCM()
        ├── requestNotificationPermission() → solicita permiso al usuario
        ├── getFCMToken() → obtiene token del dispositivo
        ├── POST /api/notifications/fcm-token → registra en backend
        ├── onTokenRefresh() → actualiza token si Firebase lo rota
        ├── onForegroundMessage() → maneja notificaciones con app abierta
        └── onBackgroundNotificationOpened() → maneja tap desde background
```

## Estados de la app al recibir notificación

| Estado | Handler | Comportamiento |
|--------|---------|----------------|
| **Foreground** (app abierta) | `onForegroundMessage` | Log + TODO: mostrar banner in-app |
| **Background** (app en segundo plano) | `onNotificationOpenedApp` | Navega a pantalla según `data.type` |
| **Killed** (app cerrada) | `getInitialNotification` | Navega al abrir la app |
| **Background silencioso** | `setBackgroundMessageHandler` | Procesamiento en background |

## Tipos de notificación (`data.type`)

| Tipo | Pantalla destino |
|------|-----------------|
| `new_service` | Detalle del servicio (`data.serviceId`) |
| `service_update` | Detalle del servicio (`data.serviceId`) |
| `settlement_ready` | Pantalla de liquidaciones |
| `general` | Sin navegación específica |

> La navegación está preparada en `handleNotificationNavigation()` dentro de `useFCM.ts`. Conectar con `navigationRef` cuando se implemente la navegación global.

## Permisos Android declarados en app.json

```json
"android.permission.RECEIVE_BOOT_COMPLETED"
"android.permission.VIBRATE"
"android.permission.POST_NOTIFICATIONS"
```

## Build con EAS

```bash
# Instalar EAS CLI (una sola vez)
npm install -g eas-cli
eas login

# Build de desarrollo (APK para testing interno)
eas build --profile development --platform android

# Build de preview (APK para QA)
eas build --profile preview --platform android

# Build de producción (AAB para Play Store)
eas build --profile production --platform android
```

> El `google-services.json` debe estar en la raíz de `TracKing-Mobile-/` antes de hacer el build.

## Logout — limpiar token

Al hacer logout, llamar al endpoint para que el mensajero no reciba notificaciones en ese dispositivo:

```typescript
// En el hook/servicio de logout
await apiClient.delete('/notifications/fcm-token');
```

## Dependencias instaladas

```json
"@react-native-firebase/app": "^x.x.x",
"@react-native-firebase/messaging": "^x.x.x"
```

> Requiere `npx expo prebuild` o EAS Build para compilar el código nativo.
