# Phase 10 — Geocoding & Service Map

## Overview

Added geographic coordinates support to the service model and a new `CourierServiceMap` component that displays pickup and delivery pins on an interactive map inside `ServiceDetailScreen`. When a service has geocoded coordinates, the courier sees both points on the map with their addresses in callouts. Also added city default configuration in the Config tab (WorkdayScreen).

---

## Architecture

```
ServiceDetailScreen
  └── service.origin_lat && service.destination_lat?
        ├── YES → <CourierServiceMap originLat/Lng destinationLat/Lng />
        │           ├── <MapView> with fitToCoordinates()
        │           ├── Marker green  #4CAF7D  (recogida)
        │           ├── Marker red    #E53E3E  (entrega)
        │           └── Marker blue   #3B82F6  (courier GPS, if available)
        └── NO  → text addresses only

WorkdayScreen (Config tab)
  └── City input → POST /api/geocoding/forward → saveMapDefaults()
```

---

## New Files

```
src/features/services/components/
└── CourierServiceMap.tsx        # MapView with origin/destination/courier pins

src/shared/utils/
└── mapDefaults.ts               # Zustand store + expo-secure-store persistence
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
  courierLat?: number | null;   // from useLocation hook
  courierLng?: number | null;
}
```

### Behavior

- `onMapReady` calls `mapRef.current?.fitToCoordinates()` with `edgePadding: { top:60, right:60, bottom:60, left:60 }` so both pins are always visible
- `initialRegion` is computed from the midpoint of origin and destination — prevents blank map before `fitToCoordinates` fires
- Courier pin (blue) is rendered only when `courierLat != null && courierLng != null`
- Each pin has a `<Callout>` showing the address label

### Pin colors

| Pin | Color | Meaning |
|-----|-------|---------|
| Green `#4CAF7D` | Recogida | Pickup point |
| Red `#E53E3E` | Entrega | Delivery point |
| Blue `#3B82F6` | Tu ubicación | Courier current GPS |

---

## mapDefaults.ts

Zustand store backed by `expo-secure-store` (key: `map_defaults`). Same pattern as `theme.store.ts`.

```typescript
interface MapDefaults { lat: number; lng: number; label: string; }

// Default fallback: Bucaramanga (7.119349, -73.122742)

useMapDefaultsStore.getState().defaults      // current city
useMapDefaultsStore.getState().setDefaults() // persist new city
useMapDefaultsStore.getState().hydrate()     // called on app start
```

Hydration is called in `AppProviders.tsx` alongside theme hydration — no blocking spinner needed since the map always has the service coordinates as its primary reference.

---

## Modified Files

### `services/types/services.types.ts`

Added 6 optional geocoding fields to the `Service` interface:

```typescript
origin_lat?:          number | null;
origin_lng?:          number | null;
origin_verified?:     boolean;
destination_lat?:     number | null;
destination_lng?:     number | null;
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
    courierLat={latitude}
    courierLng={longitude}
  />
)}
```

Fallback: when coordinates are null, only text addresses are shown (existing behavior unchanged).

### `app/providers/AppProviders.tsx`

Added `hydrateMapDefaults()` call alongside `hydrate()` (theme):

```typescript
const hydrateMapDefaults = useMapDefaultsStore((s) => s.hydrate);
useEffect(() => {
  hydrate();
  hydrateMapDefaults();
}, [hydrate, hydrateMapDefaults]);
```

### `features/workday/screens/WorkdayScreen.tsx`

New "Ciudad por defecto del mapa" section in the Config tab:

- `TextInput` for city name
- "Guardar" button calls `POST /api/geocoding/forward` via `apiClient`
- On success: `setMapDefaults({ lat, lng, label })` persists to SecureStore
- Shows current configured city below the label
- Error alert if city not found

---

## Rules

- Map is shown **only** when both `origin_lat` and `destination_lat` are non-null
- `Number()` cast is applied to coordinates since Prisma returns `Decimal` which may come as string over JSON
- Courier GPS pin uses the same `useLocation` hook already present in `ServiceDetailScreen` — no second GPS read
- City default is per-device (stored in SecureStore), independent from the web frontend's localStorage

---

## Dependencies

- `react-native-maps` — installed via `npx expo install react-native-maps`

---

## Completion Criteria

- [x] `Service` type includes 6 optional geocoding fields
- [x] `CourierServiceMap` renders green/red pins with callouts
- [x] `fitToCoordinates` adjusts zoom to show both pins
- [x] Courier GPS pin shown when location available
- [x] Map hidden when coordinates are null — text fallback shown
- [x] `mapDefaults` store hydrated on app start
- [x] City configuration UI in WorkdayScreen (Config tab)
- [x] Property tests P-11 and P-12 passing
