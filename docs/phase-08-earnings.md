# Phase 08 — Earnings & Liquidations

## Overview

Read-only screen showing the courier's accumulated earnings and liquidation history.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courier/settlements/earnings` | Earnings summary + settlements list |

A single request returns both the summary (`total_earned`, `total_services`, `total_settlements`) and the full `settlements[]` array.

---

## Real-time Updates

The earnings screen invalidates its React Query cache automatically when the backend emits a `settlement:created` WebSocket event — no manual pull-to-refresh needed when a new liquidación is generated.

```
useEarnings()
  └── useEarningsUpdates()
        └── wsClient.on('settlement:created', () =>
              queryClient.invalidateQueries({ queryKey: ['courier-earnings'] }))
```

The `settlement:created` event is emitted by the backend's `ServiceUpdatesGateway` from the `/services` namespace immediately after `GenerarLiquidacionCourierUseCase` creates a new settlement.

---

## Rules

- Strictly read-only — no create, update, or delete controls
- Pull-to-refresh supported
- Error state with retry button

---

## Files

```
src/features/earnings/
├── api/earningsApi.ts
├── hooks/
│   ├── useEarnings.ts           ← integrates useEarningsUpdates
│   └── useEarningsUpdates.ts   ← NEW: invalidates cache on settlement:created
├── screens/EarningsScreen.tsx
└── types/earnings.types.ts
```

---

## Completion Criteria

- [x] Total earnings displayed
- [x] Liquidation list rendered with amount and date
- [x] No mutation controls exposed
- [x] Pull-to-refresh works
- [x] Error state with retry button
- [x] Cache invalidated automatically when new settlement arrives via WebSocket
