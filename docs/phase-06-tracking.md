# Phase 06 — GPS Tracking

## Overview

Automatically reports the courier's GPS location to the backend while an active service is in progress. Stops when the service is delivered or the workday ends.

---

## API Endpoint

| Method | Path | Body |
|--------|------|------|
| POST | `/api/courier/location` | `{ latitude, longitude, accuracy }` |

---

## Rules

- Send every **10 seconds**
- Only when courier has an active service (`ACCEPTED` or `IN_TRANSIT`)
- Stop when service reaches `DELIVERED` or workday ends
- On `400` response: stop interval, log error
- Battery optimization: low-accuracy mode in background

---

## Files

```
src/features/tracking/
├── api/locationApi.ts
├── hooks/useLocationReporter.ts
└── types/tracking.types.ts
```

---

## Completion Criteria

- [ ] Location permission requested before starting
- [ ] Permission denial shows non-blocking warning
- [ ] Location sent every 10s when active service exists
- [ ] Reporting stops on DELIVERED or workday end
- [ ] 400 response stops the interval
- [ ] No location sent when no active service
