# Cómo generar el APK para instalación directa en Android

El APK se conecta a:
**`https://tracking-backend-g4mq.onrender.com`**

La URL está hardcodeada en `src/core/api/apiClient.ts` línea 6.

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

### 1. Instalar dependencias

```bash
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
.\gradlew.bat assembleRelease
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

## Verificar que el APK se conecta correctamente

Después de instalar el APK, abre la app e intenta iniciar sesión. Si ves el error **"Sin conexión"**:

1. **Verifica que el backend está activo**
   ```bash
   curl https://tracking-backend-g4mq.onrender.com/api/health
   ```
   Si está en Render con plan gratuito, puede tardar ~30 segundos en responder la primera vez.

2. **Verifica la conectividad del celular**
   - Asegurate de que el celular tiene internet (WiFi o datos móviles)
   - Intenta abrir un navegador y acceder a cualquier sitio

3. **Ver logs de la app**
   ```bash
   adb logcat | grep -i "api\|error\|connection"
   ```

---

## Notas importantes

- **URL del backend**: Está hardcodeada en `src/core/api/apiClient.ts` línea 6 como `https://tracking-backend-g4mq.onrender.com`
- **Para cambiar la URL**: Edita `src/core/api/apiClient.ts` línea 6 y recompila
- **Cold start en Render**: Si el backend está en Render con plan gratuito, puede tardar ~30 segundos en responder la primera petición
- **APK no firmado**: El APK generado no está firmado con una clave de producción, por lo que es apto para distribución interna/testing pero no para publicar en Google Play
