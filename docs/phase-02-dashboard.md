# Phase 02 — Dashboard

## Overview

The home screen shown after login. Displays the courier's profile, operational status, KPI cards, active service, and a map with current GPS position.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courier/me` | Courier profile + operational status |
| GET | `/api/courier/services` | Used to derive KPI counts |

---

## Files

```
src/features/dashboard/
├── api/dashboardApi.ts
├── components/
│   ├── Header.tsx
│   ├── KPIBox.tsx
│   └── ActiveServiceCard.tsx
├── hooks/useDashboard.ts
├── screens/HomeScreen.tsx
└── types/dashboard.types.ts
```

---

## Layout

```
┌─────────────────────────────┐
│ Header: name + status badge │
├─────────────────────────────┤
│ KPI row: Pending | Done | $ │
├─────────────────────────────┤
│ Map (current GPS position)  │
├─────────────────────────────┤
│ Active service card (if any)│
└─────────────────────────────┘
```

---

## Status Colors

| Status | Color |
|--------|-------|
| AVAILABLE | `#22C55E` (success) |
| UNAVAILABLE | `#1F2937` (neutral) |

---

## Completion Criteria

- [ ] Courier name and status displayed in header
- [ ] Three KPI cards rendered
- [ ] Active service card shown when service is ACCEPTED or IN_TRANSIT
- [ ] "No active service" message shown otherwise
- [ ] Map shows current GPS position
- [ ] Error state with retry button on fetch failure
