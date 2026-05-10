# Cómo generar el IPA para instalación en iOS

Esta rama (`ipa`) está configurada para conectarse al backend en la nube:
**`https://tracking-backend-tald.onrender.com`**

---

## Requisitos previos

### Obligatorios

- [Node.js](https://nodejs.org/) v18 o superior
- [Expo CLI](https://docs.expo.dev/get-started/installation/) instalado globalmente:
  ```bash
  npm install -g expo-cli
  ```
- [EAS CLI](https://docs.expo.dev/build/setup/) instalado globalmente:
  ```bash
  npm install -g eas-cli
  ```
- **Cuenta en Expo** (gratuita o de pago) - [Crear cuenta](https://expo.dev)
- **Apple Developer Account** ($99/año) - [Crear cuenta](https://developer.apple.com)

### Opcionales (si compilas localmente)

- **macOS** con Xcode instalado (solo si quieres compilar localmente sin usar Expo Cloud Build)
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

---

## Estrategia recomendada: Expo Cloud Build

La forma más fácil es usar **Expo Cloud Build**, que compila en servidores de Apple en la nube. **No necesitas Mac**.

---

## Pasos para generar el IPA con Expo Cloud Build

### 1. Clonar la rama e instalar dependencias

```bash
git clone -b ipa <URL_DEL_REPO>
cd courier-mobile-app
npm install
```

### 2. Loguéate en Expo

```bash
eas login
```

Ingresá tus credenciales de Expo. Si no tienes cuenta, [créala aquí](https://expo.dev).

### 3. Configurar EAS (primera vez)

```bash
eas build:configure
```

Esto crea el archivo `eas.json` con la configuración necesaria. Selecciona:
- **Platform**: iOS
- **Build type**: Release

### 4. Configurar certificados de Apple

La primera vez que ejecutes el build, EAS te pedirá:

```bash
eas build --platform ios
```

Seguí estos pasos:

1. **Crear Apple App ID** (si no lo tienes):
   - Ingresá a [Apple Developer](https://developer.apple.com/account)
   - Ve a **Certificates, Identifiers & Profiles** → **Identifiers**
   - Crea un nuevo App ID con el bundle identifier: `com.tracking.trackingmobileapp`

2. **Generar certificados automáticamente**:
   - EAS te ofrecerá generar certificados automáticamente
   - Selecciona **"Let EAS handle this"** (recomendado)
   - EAS creará los certificados necesarios

3. **Provisioning Profile**:
   - EAS también generará el provisioning profile automáticamente

### 5. Iniciar la compilación en la nube

```bash
eas build --platform ios
```

Esto:
- Sube tu código a los servidores de Expo
- Compila en macOS en la nube
- Genera el IPA firmado
- Descarga el IPA a tu máquina

> La compilación tarda entre 5-15 minutos.

### 6. Ubicación del IPA descargado

Una vez finalizado, el IPA estará en:

```
./ipa-<timestamp>.ipa
```

O puedes descargarlo desde el dashboard de Expo:
- Ve a [expo.dev/builds](https://expo.dev/builds)
- Busca tu build reciente
- Descarga el IPA

---

## Instalar el IPA en el iPhone

### Opción A — TestFlight (Recomendado para testing)

1. Sube el IPA a TestFlight desde Xcode o App Store Connect
2. Invita a testers con su Apple ID
3. Los testers descargan la app desde la app **TestFlight**

**Ventajas:**
- No necesitas registrar dispositivos específicos
- Máximo 100 testers internos, ilimitados externos
- Fácil de distribuir

**Pasos:**
```bash
# Desde Xcode (si tienes Mac)
xcode-select --install
open -a Xcode ipa-<timestamp>.ipa
# Luego: Product → Destination → Generic iOS Device
# Product → Archive → Distribute App → TestFlight
```

### Opción B — Instalación directa con Xcode (requiere Mac)

1. Conecta el iPhone por USB
2. Abre Xcode
3. Ve a **Window** → **Devices and Simulators**
4. Selecciona tu iPhone
5. Arrastra el IPA al área de apps

### Opción C — Instalación con Apple Configurator (requiere Mac)

1. Descarga [Apple Configurator 2](https://apps.apple.com/app/apple-configurator-2/id1037126344)
2. Conecta el iPhone
3. Arrastra el IPA a Apple Configurator
4. Selecciona tu iPhone y haz clic en **Add**

### Opción D — Ad Hoc (requiere registrar dispositivos)

1. Obtén el UDID del iPhone:
   ```bash
   # Conecta el iPhone y ejecuta:
   system_profiler SPUSBDataType | grep "Serial Number"
   ```

2. Registra el dispositivo en [Apple Developer](https://developer.apple.com/account)

3. Genera un provisioning profile Ad Hoc

4. Compila con ese perfil:
   ```bash
   eas build --platform ios --profile adhoc
   ```

5. Instala con Xcode o Apple Configurator

---

## Alternativa: Compilar localmente en Mac

Si tienes Mac y quieres compilar localmente:

```bash
# 1. Generar archivos nativos de iOS
npx expo prebuild --platform ios --clean

# 2. Abrir en Xcode
open ios/CourierMobileApp.xcworkspace

# 3. En Xcode:
# - Selecciona "Generic iOS Device" como destino
# - Product → Archive
# - Distribute App → Ad Hoc o TestFlight
```

---

## Notas importantes

- **No necesitas Mac** si usas Expo Cloud Build
- El IPA generado con Expo Cloud Build **está firmado automáticamente** con los certificados de Apple
- Para **producción (App Store)**, necesitas:
  - Cuenta de Apple Developer ($99/año)
  - Completar el proceso de review de Apple
  - Usar `eas build --platform ios` con el perfil de App Store

- Si el backend en Render está en el plan gratuito, puede tardar ~30 segundos en responder la primera petición (cold start)

- **Documentación oficial:**
  - [Expo Build Documentation](https://docs.expo.dev/build/introduction/)
  - [EAS Build for iOS](https://docs.expo.dev/build/building-on-ci/)
  - [Apple Developer Documentation](https://developer.apple.com/documentation/)

---

## Troubleshooting

### Error: "Apple Developer Account not found"

- Verifica que tu Apple ID esté correcto en Expo
- Asegurate de tener una cuenta de Apple Developer activa ($99/año)

### Error: "Provisioning profile not found"

- Ejecuta `eas build --platform ios --clear-cache` para limpiar la caché
- Vuelve a ejecutar `eas build --platform ios`

### El build se queda en "pending"

- Espera 5-10 minutos más (los servidores de Expo pueden estar ocupados)
- Verifica tu conexión a internet
- Intenta de nuevo: `eas build --platform ios --clear-cache`

### No puedo instalar el IPA en mi iPhone

- Verifica que el UDID del dispositivo esté registrado (si usas Ad Hoc)
- Intenta con TestFlight (más fácil)
- Asegurate de que el IPA esté firmado correctamente

