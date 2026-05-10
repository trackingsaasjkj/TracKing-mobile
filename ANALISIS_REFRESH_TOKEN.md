# Análisis: Cierre de Sesión después de 15 minutos en Producción

## Problema Identificado

La sesión se cierra después de 15 minutos en producción porque **NO HAY UN MECANISMO DE REFRESH AUTOMÁTICO DEL TOKEN DE AUTENTICACIÓN**.

## Flujo Actual (Incorrecto)

1. **Login**: El usuario inicia sesión y recibe un `accessToken` que se almacena en:
   - `authStore.accessToken` (en memoria)
   - `secureStorage` (en disco)

2. **Uso del Token**: El token se adjunta a cada request en el interceptor de `apiClient`:
   ```typescript
   // src/core/api/apiClient.ts - Request interceptor
   config.headers.Authorization = `Bearer ${token}`;
   ```

3. **Expiración del Token**: Después de ~15 minutos (TTL del token en el backend):
   - El backend rechaza requests con `401 Unauthorized`
   - El interceptor de respuesta intenta hacer refresh:
     ```typescript
     await apiClient.post('/api/auth/refresh');
     ```

4. **Problema**: El refresh solo ocurre cuando hay un request que falla con 401
   - Si el usuario está inactivo (sin hacer requests), el token expira silenciosamente
   - Cuando el usuario intenta hacer algo, obtiene 401 y se cierra la sesión

## Raíz del Problema

### 1. No hay polling del token
El hook `useAutoRefresh` existe pero:
- Solo se usa en `useServices.ts` para refrescar datos de servicios (cada 15s)
- **NO se usa para refrescar el token de autenticación**
- El intervalo de 15s coincide con el TTL del token, lo que es una coincidencia

### 2. El refresh solo es reactivo
El refresh del token solo ocurre cuando:
- Un request falla con 401
- El usuario está activo haciendo requests

### 3. En producción, el usuario puede estar inactivo
- Si el usuario abre la app y no hace nada por 15 minutos
- El token expira silenciosamente
- Cuando intenta hacer algo, obtiene 401 y se cierra la sesión

## Solución

Crear un mecanismo de **refresh proactivo del token** que:

1. Llame a `/api/auth/refresh` cada 10 minutos (antes de que expire a los 15)
2. Se ejecute incluso si el usuario está inactivo
3. Maneje errores de refresh gracefully

### Opción A: Hook dedicado para refresh de token (Recomendado)

```typescript
// src/core/hooks/useTokenRefresh.ts
export function useTokenRefresh() {
  const { accessToken } = useAuthStore();
  
  const refreshToken = useCallback(async () => {
    if (!accessToken) return;
    try {
      await apiClient.post('/api/auth/refresh');
    } catch (error) {
      // Si el refresh falla, el interceptor de respuesta manejará el 401
      console.error('[TokenRefresh] Failed:', error);
    }
  }, [accessToken]);

  // Refresh cada 10 minutos (antes de que expire a los 15)
  useAutoRefresh(refreshToken, { 
    foregroundInterval: 10 * 60 * 1000,
    enabled: !!accessToken 
  });
}
```

### Opción B: Integrar en useSessionRestore

Agregar un refresh periódico después de restaurar la sesión.

## Archivos Afectados

- `src/core/hooks/useTokenRefresh.ts` (crear nuevo)
- `src/App.tsx` o `src/core/hooks/useSessionRestore.ts` (usar el nuevo hook)

## Verificación

Después de implementar:
1. Abrir la app
2. Esperar 15+ minutos sin hacer nada
3. Hacer un request (ej: cambiar estado operacional)
4. Verificar que funciona sin cerrar sesión

## Notas Adicionales

- El TTL del token en el backend parece ser ~15 minutos
- El refresh debe ocurrir cada 10 minutos para tener margen de seguridad
- El WebSocket (`wsClient`) tiene su propio ping/pong cada 25s, pero no maneja refresh de token
- El FCM token es diferente del access token y tiene su propio mecanismo de refresh
