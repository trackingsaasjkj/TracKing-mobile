# Cómo generar el APK para instalación directa en Android

Esta rama (`apk`) está configurada para conectarse al backend en la nube:
**`https://tracking-backend-tald.onrender.com`**

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [Java JDK 17](https://adoptium.net/) (recomendado: Eclipse Temurin 17)
- [Android Studio](https://developer.android.com/studio) con el SDK de Android instalado
- Variables de entorno configuradas:
  - `ANDROID_HOME` apuntando al SDK de Android
  - `JAVA_HOME` apuntando al JDK 17

Verificá que estén bien configuradas:
```bash
echo $ANDROID_HOME   # ej: C:/Users/TuUsuario/AppData/Local/Android/Sdk
echo $JAVA_HOME      # ej: C:/Program Files/Eclipse Adoptium/jdk-17...
```

---

## Pasos para generar el APK

### 1. Clonar la rama y instalar dependencias

```bash
git clone -b apk <URL_DEL_REPO>
cd courier-mobile-app
npm install
```

### 2. Generar los archivos nativos de Android

Si la carpeta `android/` no existe o está desactualizada:

```bash
npx expo prebuild --platform android --clean
```

> Esto genera la carpeta `android/` con todo el proyecto nativo.

### 3. Configurar `local.properties`

Dentro de `android/local.properties`, asegurate de que apunte a tu SDK:

```
sdk.dir=C\:\\Users\\TuUsuario\\AppData\\Local\\Android\\Sdk
```

> En Windows usá doble barra invertida `\\`. En Mac/Linux usá la ruta normal.

### 4. Compilar el APK de release

```bash
cd android
./gradlew assembleRelease
```

En Windows:
```bash
cd android
gradlew.bat assembleRelease
```

> La compilación puede tardar varios minutos la primera vez.

### 5. Ubicación del APK generado

Una vez finalizado, el APK estará en:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Instalar el APK en el celular

### Opción A — Transferencia directa

1. Copiá el archivo `app-release.apk` al celular (por USB, Google Drive, WhatsApp, etc.)
2. En el celular, abrí el archivo desde el administrador de archivos
3. Si aparece un aviso de seguridad, habilitá **"Instalar apps de fuentes desconocidas"** en Ajustes → Seguridad
4. Seguí los pasos de instalación

### Opción B — ADB (con el celular conectado por USB)

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

> Asegurate de tener habilitada la **Depuración USB** en las opciones de desarrollador del celular.

---

## Notas importantes

- El APK generado con `assembleRelease` **no está firmado con una clave de producción**, por lo que es apto para distribución interna/testing pero no para publicar en Google Play.
- Si el backend en Render está en el plan gratuito, puede tardar ~30 segundos en responder la primera petición (cold start).
- Para builds de producción firmados, se necesita un keystore. Consultá la [documentación oficial de Expo](https://docs.expo.dev/build/building-on-ci/).
