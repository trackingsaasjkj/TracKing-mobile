# Phase 03 — Services

## Overview

List and detail screens for the courier's assigned services. Displays status badges and full service information.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courier/services` | List assigned services |

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
├── hooks/useServices.ts
├── screens/
│   ├── ServicesScreen.tsx
│   └── ServiceDetailScreen.tsx
├── store/servicesStore.ts
└── types/services.types.ts
```

---

## Completion Criteria

- [ ] Service list fetched and displayed
- [ ] Each card shows ID, origin, destination, customer, price, status badge
- [ ] Tap navigates to detail screen
- [ ] Detail shows full service info
- [ ] Pull-to-refresh works
- [ ] Error state with retry button
