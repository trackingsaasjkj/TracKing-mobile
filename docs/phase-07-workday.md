# Phase 07 — Workday Management

## Overview

Allows the courier to start and end their operational shift. Controls availability for service assignments.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/courier/jornada/start` | UNAVAILABLE → AVAILABLE |
| POST | `/api/courier/jornada/end` | AVAILABLE → UNAVAILABLE |

---

## Rules

- Cannot end workday while active services exist (API returns `400`)
- "Start Workday" disabled when status is `AVAILABLE`
- "End Workday" disabled when status is `UNAVAILABLE`

---

## Files

```
src/features/workday/
├── api/workdayApi.ts
└── hooks/useWorkday.ts
```

---

## Completion Criteria

- [ ] Start workday updates status to AVAILABLE
- [ ] End workday updates status to UNAVAILABLE
- [ ] 400 on end shows "active services pending" message
- [ ] Buttons disabled based on current status
