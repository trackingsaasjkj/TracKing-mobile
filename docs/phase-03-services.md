# Phase 03 — Services

## Overview

List and detail screens for the courier's assigned services. Displays status badges and full service information.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courier/services` | List assigned services |
| GET | `/api/courier/services/:id` | Service detail |
| POST | `/api/courier/services/:id/status` | Update service status |

---

## Real-time Updates

Services are kept in sync via a three-layer strategy:

| Layer | Mechanism | Latency | When active |
|-------|-----------|---------|-------------|
| 1 | WebSocket (`/services` namespace) | < 50ms | App in foreground |
| 2 | FCM push notification | ~1–3s | App in background / killed |
| 3 | Polling (`useAutoRefresh`) | 45s | Fallback when WS unavailable |

The hook `useServiceUpdates()` manages layers 1 and 2. It is mounted once inside `useServices()`.

```
useServices()
  └── useServiceUpdates()
        ├── wsClient.connect(token)
        ├── wsClient.on('service:updated')  → updateService() + setQueryData()
        ├── wsClient.on('service:assigned') → addService() + invalidateQueries()
        └── onServiceUpdateMessage() [FCM foreground]
```

### WebSocket events

| Event | Payload | Action |
|-------|---------|--------|
| `service:updated` | `Service` object | Updates service in store + React Query cache |
| `service:assigned` | `Service` object | Adds service to store + invalidates list query |
| `connection:ack` | `{ courierId, timestamp }` | Resets reconnect counter |

---

## Service States

```
ASSIGNED → ACCEPTED → IN_TRANSIT → DELIVERED
```

## Status Badge Colors

| State | Color |
|-------|-------|
| ASSIGNED | `#F59E0B` (warning) |
| ACCEPTED | `#2563EB` (primary) |
| IN_TRANSIT | `#3B82F6` (primary-light) |
| DELIVERED | `#22C55E` (success) |

---

## Files

```
src/features/services/
├── api/servicesApi.ts
├── components/
│   ├── ServiceCard.tsx
│   └── StatusBadge.tsx
├── hooks/
│   ├── useServices.ts          ← useServices + useServiceDetail
│   └── useServiceUpdates.ts   ← WS + FCM real-time sync
├── screens/
│   ├── ServicesScreen.tsx
│   └── ServiceDetailScreen.tsx
├── store/servicesStore.ts
└── types/services.types.ts
```

---

## Completion Criteria

- [x] Service list fetched and displayed
- [x] Each card shows ID, origin, destination, customer, price, status badge
- [x] Tap navigates to detail screen
- [x] Detail shows full service info
- [x] Pull-to-refresh works
- [x] Error state with retry button
- [x] Real-time updates via WebSocket (service:updated, service:assigned)
- [x] FCM fallback when app is in background
