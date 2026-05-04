# Fix: Background Location Tracking - Corrección de Cuándo se Inicia

## Problema Identificado

El tracking en segundo plano se iniciaba cuando el mensajero comenzaba su jornada (status = `AVAILABLE`), pero **debería iniciarse solo cuando acepta un servicio** (status = `IN_SERVICE`).

### Comportamiento Anterior ❌
```
Usuario presiona "Iniciar Jornada"
    ↓
startWorkday() → operationalStatus = AVAILABLE
    ↓
startWorkdayTracking() ← ⚠️ INICIA TRACKING AQUÍ
    ↓
Tracking activo incluso sin servicios asignados
```

### Comportamiento Correcto ✅
```
Usuario presiona "Iniciar Jornada"
    ↓
startWorkday() → operationalStatus = AVAILABLE
    ↓
❌ NO inicia tracking (espera servicios)
    ↓
Usuario acepta un servicio
    ↓
useServiceTracking() detecta servicios activos
    ↓
startWorkdayTracking() ← ✅ INICIA TRACKING AQUÍ
    ↓
Tracking activo solo mientras hay servicios
    ↓
Último servicio completado
    ↓
stopWorkdayTracking() ← ✅ DETIENE TRACKING
```

---

## Cambios Realizados

### 1. **useWorkday.ts** - Remover tracking de inicio de jornada
- ❌ Removido: `startWorkdayTracking()` en `startWorkday()`
- ❌ Removido: Validación de permisos de background location
- ✅ Agregado: Comentario explicando que el tracking se maneja en `useServiceTracking`

**Antes:**
```typescript
const startWorkday = async () => {
  await workdayApi.start();
  setOperationalStatus('AVAILABLE');
  
  // ❌ AQUÍ INICIABA EL TRACKING
  const trackingResult = await startWorkdayTracking();
  if (!trackingResult.success) {
    // Rollback y error...
  }
};
```

**Después:**
```typescript
const startWorkday = async () => {
  await workdayApi.start();
  setOperationalStatus('AVAILABLE');
  
  // ✅ Tracking se inicia cuando hay servicios activos
  // Ver useServiceTracking.ts
};
```

---

### 2. **useServiceTracking.ts** (NUEVO) - Monitorear cambios de servicios
Nuevo hook que:
- ✅ Monitorea cambios en la lista de servicios
- ✅ Inicia tracking cuando hay servicios activos (ASSIGNED, ACCEPTED, IN_TRANSIT)
- ✅ Detiene tracking cuando no hay servicios activos
- ✅ Respeta el estado operacional (solo actúa si AVAILABLE o IN_SERVICE)

```typescript
export function useServiceTracking(): void {
  const services = useServicesStore((s) => s.services);
  const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
  const { startWorkdayTracking, stopWorkdayTracking } = useWorkdayTracking();
  
  useEffect(() => {
    // Si hay servicios activos → inicia tracking
    // Si no hay servicios activos → detiene tracking
    // Si jornada terminó → detiene tracking
  }, [services, operationalStatus]);
}
```

---

### 3. **RootNavigator.tsx** - Montar hook global
- ✅ Importado: `useServiceTracking`
- ✅ Agregado: `useServiceTracking()` en el componente
- Esto asegura que el hook se ejecute durante toda la sesión

```typescript
export function RootNavigator() {
  usePermissions();
  useServiceTracking(); // ← NUEVO
  
  // ...
}
```

---

### 4. **useSessionRestore.ts** - Restauración inteligente
- ✅ Modificado: `restoreWorkdayTracking()` solo restaura si `IN_SERVICE`
- ✅ Si `AVAILABLE`: No restaura (espera a que `useServiceTracking` lo inicie)
- Esto evita iniciar tracking innecesariamente tras un crash

**Antes:**
```typescript
if (profile.operational_status === 'AVAILABLE' || 
    profile.operational_status === 'IN_SERVICE') {
  await restoreWorkdayTracking(); // ❌ Iniciaba en AVAILABLE
}
```

**Después:**
```typescript
if (profile.operational_status === 'IN_SERVICE') {
  await restoreWorkdayTracking(); // ✅ Solo en IN_SERVICE
}
```

---

### 5. **workdayBackgroundTask.ts** - Actualizar documentación
- ✅ Actualizado: Comentarios para reflejar que se inicia por servicios activos
- No hay cambios en la lógica, solo en la documentación

---

## Flujo Completo Actualizado

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario inicia sesión                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. RootNavigator monta useServiceTracking()             │
│    (monitorea cambios de servicios)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Usuario presiona "Iniciar Jornada"                   │
│    → operationalStatus = AVAILABLE                       │
│    → ❌ NO inicia tracking                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. useServiceTracking detecta: sin servicios activos    │
│    → tracking sigue detenido                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Usuario acepta un servicio                           │
│    → servicio.status = ASSIGNED/ACCEPTED/IN_TRANSIT     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. useServiceTracking detecta: servicios activos        │
│    → ✅ INICIA TRACKING                                 │
│    → startWorkdayTracking()                             │
│    → Envía ubicación cada 15 segundos                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Usuario completa/cancela todos los servicios         │
│    → servicios.length = 0 (sin activos)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 8. useServiceTracking detecta: sin servicios activos    │
│    → ✅ DETIENE TRACKING                                │
│    → stopWorkdayTracking()                              │
└─────────────────────────────────────────────────────────┘
```

---

## Beneficios

✅ **Ahorro de batería**: Tracking solo activo durante entregas  
✅ **Privacidad**: No se rastrea ubicación en tiempo de espera  
✅ **Claridad**: Tracking vinculado a servicios activos, no a jornada  
✅ **Robustez**: Manejo automático de transiciones de estado  
✅ **Recuperación**: Restauración inteligente tras crashes  

---

## Testing

Los cambios afectan:
- `src/features/workday/hooks/useWorkday.ts` - Actualizar tests
- `src/features/tracking/hooks/useServiceTracking.ts` - Nuevos tests
- `src/core/hooks/useSessionRestore.ts` - Actualizar tests

### Tests a Actualizar

1. **useWorkday.test.ts**
   - ❌ Remover: Test que verifica que `startWorkday()` inicia tracking
   - ✅ Agregar: Test que verifica que `startWorkday()` NO inicia tracking

2. **useServiceTracking.test.ts** (NUEVO)
   - ✅ Test: Inicia tracking cuando hay servicios activos
   - ✅ Test: Detiene tracking cuando no hay servicios
   - ✅ Test: Detiene tracking cuando jornada termina
   - ✅ Test: Restaura tracking si IN_SERVICE tras crash

3. **useSessionRestore.test.ts**
   - ❌ Remover: Test que restaura tracking en AVAILABLE
   - ✅ Actualizar: Test que solo restaura en IN_SERVICE

---

## Notas de Implementación

- El hook `useServiceTracking` usa `useRef` para evitar múltiples inicios/paradas
- Los logs incluyen `[ServiceTracking]` para fácil debugging
- Los errores se capturan pero no interrumpen el flujo
- Compatible con la restauración automática tras crashes
