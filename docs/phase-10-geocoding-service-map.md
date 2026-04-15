# Phase 10 — Geocoding & Service Map

## Overview

Soporte de coordenadas geográficas en el modelo de servicio y componente `CourierServiceMap` que muestra los puntos de recogida y entrega en un mapa interactivo. El mapa aparece en `ServiceDetailScreen` (vista compacta) y en `TrackingScreen` (pantalla completa). También incluye configuración de ciudad por defecto en el tab Config.

---

## Arquitectura

```
ServiceDetailScreen
  └── service.origin_lat && service.destination_lat?
        ├── SÍ → <CourierServiceMap originLat/Lng destinationLat/Lng courierLat/Lng />
        │           ├── WebView + Leaflet + Maptiler tiles
        │           ├── Pin verde   #4CAF7D  (recogida)
        │           ├── Pin rojo    #E53E3E  (entrega)
        │           └── Pin azul    primary  (courier GPS, si disponible)
        └── NO → solo direcciones en texto

TrackingScreen (tab "Mapa")
  └── servicio activo con geocoords?
        ├── SÍ → <CourierServiceMap fullScreen />   ← mismo componente, pantalla completa
        └── NO → estado vacío o aviso de coordenadas

WorkdayScreen (tab Config)
  └── Input ciudad → POST /api/geocoding/forward → saveMapDefaults()
```

---

## Archivos

```
src/features/services/components/
└── CourierServiceMap.tsx        # WebView + Leaflet, pins origen/destino/courier

src/shared/utils/
└── mapDefaults.ts               # Zustand store + expo-secure-store para ciudad por defecto

src/config/
└── map.ts                       # MAPTILER_KEY desde EXPO_PUBLIC_MAPTILER_KEY
```

---

## CourierServiceMap

### Props

```typescript
interface CourierServiceMapProps {
  originLat: number;
  originLng: number;
  originAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  courierLat?: number | null;   // desde useTrackingCoords()
  courierLng?: number | null;
  fullScreen?: boolean;         // true → flex:1, sin altura fija ni bordes
}
```

### Comportamiento

- El HTML de Leaflet se construye **una sola vez** con `useMemo` (deps: coords estáticas + colores del tema)
- `fitBounds` en Leaflet centra el mapa para mostrar todos los pins visibles
- El pin del courier se actualiza via `postMessage` → `marker.setLatLng()` — sin reload del WebView
- Popup en cada pin con la dirección correspondiente

### Modos de visualización

| Prop `fullScreen` | Uso | Estilo |
|---|---|---|
| `false` (default) | `ServiceDetailScreen` (dentro de scroll) | `height: 260`, bordes redondeados, margen vertical |
| `true` | `TrackingScreen` (tab dedicado) | `flex: 1`, sin altura fija, sin bordes, sin margen |

### Colores de pins

| Pin | Color | Significado |
|-----|-------|-------------|
| Verde `#4CAF7D` | Recogida | Punto de origen |
| Rojo `#E53E3E` | Entrega | Punto de destino |
| Azul `colors.primary` | Tu ubicación | Posición GPS actual del courier |

### Proveedor de tiles — Maptiler

```javascript
L.tileLayer(
  'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAPTILER_KEY}',
  { maxZoom: 19 }
).addTo(map);
```

La key se importa desde `src/config/map.ts` que lee `process.env.EXPO_PUBLIC_MAPTILER_KEY`.

---

## Configuración de la API key

```
src/config/map.ts          ← fuente única de verdad
.env                       ← EXPO_PUBLIC_MAPTILER_KEY=tu_key
```

```typescript
// src/config/map.ts
export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

if (__DEV__ && !MAPTILER_KEY) {
  console.warn('[map.ts] EXPO_PUBLIC_MAPTILER_KEY is missing. Map tiles will fail (403).');
}
```

El prefijo `EXPO_PUBLIC_` es obligatorio para que Metro incluya la variable en el bundle del cliente.

---

## mapDefaults.ts

Zustand store respaldado por `expo-secure-store` (key: `map_defaults`). Mismo patrón que `theme.store.ts`.

```typescript
interface MapDefaults { lat: number; lng: number; label: string; }

// Fallback por defecto: Bucaramanga (7.119349, -73.122742)

useMapDefaultsStore.getState().defaults      // ciudad actual
useMapDefaultsStore.getState().setDefaults() // persiste nueva ciudad
useMapDefaultsStore.getState().hydrate()     // llamado al iniciar la app
```

La hidratación se llama en `AppProviders.tsx` junto con la del tema — sin spinner bloqueante ya que el mapa siempre tiene las coordenadas del servicio como referencia primaria.

---

## Archivos modificados

### `services/types/services.types.ts`

6 campos opcionales de geocodificación en la interfaz `Service`:

```typescript
origin_lat?:           number | null;
origin_lng?:           number | null;
origin_verified?:      boolean;
destination_lat?:      number | null;
destination_lng?:      number | null;
destination_verified?: boolean;
```

### `services/screens/ServiceDetailScreen.tsx`

```tsx
{service.origin_lat != null && service.destination_lat != null && (
  <CourierServiceMap
    originLat={Number(service.origin_lat)}
    originLng={Number(service.origin_lng!)}
    originAddress={service.origin_address}
    destinationLat={Number(service.destination_lat)}
    destinationLng={Number(service.destination_lng!)}
    destinationAddress={service.destination_address}
    courierLat={latitude}    // desde useTrackingCoords()
    courierLng={longitude}
  />
)}
```

Fallback: cuando las coordenadas son null, solo se muestran las direcciones en texto.

### `features/tracking/screens/TrackingScreen.tsx`

```tsx
<CourierServiceMap
  originLat={Number(activeService.origin_lat)}
  originLng={Number(activeService.origin_lng)}
  originAddress={activeService.origin_address}
  destinationLat={Number(activeService.destination_lat)}
  destinationLng={Number(activeService.destination_lng)}
  destinationAddress={activeService.destination_address}
  courierLat={latitude}
  courierLng={longitude}
  fullScreen   // ← modo pantalla completa
/>
```

### `app/providers/AppProviders.tsx`

```typescript
const hydrateMapDefaults = useMapDefaultsStore((s) => s.hydrate);
useEffect(() => {
  hydrate();
  hydrateMapDefaults();
}, [hydrate, hydrateMapDefaults]);
```

### `features/workday/screens/WorkdayScreen.tsx`

Sección "Ciudad por defecto del mapa" en el tab Config:
- `TextInput` para nombre de ciudad
- Botón "Guardar" llama `POST /api/geocoding/forward` via `apiClient`
- En éxito: `setMapDefaults({ lat, lng, label })` persiste en SecureStore
- Muestra la ciudad configurada actualmente
- Alert de error si la ciudad no se encuentra

---

## Reglas

- El mapa se muestra **solo** cuando `origin_lat` y `destination_lat` son no-null
- Cast `Number()` aplicado a las coordenadas — Prisma retorna `Decimal` que puede llegar como string en JSON
- El pin del courier usa coords del `useTrackingStore` — sin segunda lectura GPS
- La ciudad por defecto es por dispositivo (SecureStore), independiente del localStorage del frontend web

---

## Criterios de completitud

- [x] `Service` incluye 6 campos opcionales de geocodificación
- [x] `CourierServiceMap` renderiza pins verde/rojo con popups de dirección
- [x] `fitBounds` ajusta el zoom para mostrar todos los pins
- [x] Pin del courier mostrado cuando la ubicación está disponible
- [x] Mapa oculto cuando las coordenadas son null — fallback de texto
- [x] Store `mapDefaults` hidratado al iniciar la app
- [x] UI de configuración de ciudad en WorkdayScreen (tab Config)
- [x] Prop `fullScreen` para uso en TrackingScreen
- [x] Maptiler como proveedor de tiles (CDN, free tier 100k/mes)
- [x] API key centralizada en `src/config/map.ts`
- [x] `postMessage` para actualizar pin del courier sin reload
- [x] `CourierServiceMap` reutilizado en `TrackingScreen` con `fullScreen`
