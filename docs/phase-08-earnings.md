# Phase 08 — Earnings & Liquidations

## Overview

Read-only screen showing the courier's accumulated earnings and liquidation history.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/liquidations/earnings` | Earnings summary |
| GET | `/api/liquidations` | Liquidation list (filtered by courier from JWT) |

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
├── hooks/useEarnings.ts
├── screens/EarningsScreen.tsx
└── types/earnings.types.ts
```

---

## Completion Criteria

- [ ] Total earnings displayed
- [ ] Liquidation list rendered with amount and date
- [ ] No mutation controls exposed
- [ ] Pull-to-refresh works
- [ ] Error state with retry button
