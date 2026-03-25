# Phase 04 — Operational Flow

## Overview

Allows the courier to progress a service through its lifecycle states. The backend is the sole source of truth — the app only sends transition requests and reflects the response.

---

## API Endpoint

| Method | Path | Body |
|--------|------|------|
| POST | `/api/courier/services/:id/status` | `{ "status": "ACCEPTED" \| "IN_TRANSIT" \| "DELIVERED" }` |

---

## Valid Transitions

```
ASSIGNED   → ACCEPTED   (action: "Accept Service")
ACCEPTED   → IN_TRANSIT (action: "Start Transit")
IN_TRANSIT → DELIVERED  (action: "Mark Delivered" — requires evidence)
```

---

## UI Rules

| Current State | Button Shown | Button Disabled When |
|---------------|-------------|----------------------|
| ASSIGNED | Accept Service | never |
| ACCEPTED | Start Transit | never |
| IN_TRANSIT | Mark Delivered | no evidence uploaded |
| DELIVERED | — | always (no buttons) |

---

## Completion Criteria

- [ ] Only the correct action button is shown per state
- [ ] Transition request sent to backend on tap
- [ ] Loading indicator + disabled buttons during request
- [ ] API 400 error displayed, local state not updated
- [ ] DELIVERED state removes all action buttons
- [ ] "Mark Delivered" disabled until evidence is uploaded
