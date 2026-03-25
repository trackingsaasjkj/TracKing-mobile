# Phase 05 — Evidence

## Overview

Allows the courier to take a photo and upload it as delivery evidence. Required before marking a service as DELIVERED.

---

## API Endpoint

| Method | Path | Body |
|--------|------|------|
| POST | `/api/courier/services/:id/evidence` | `{ "image_url": "https://..." }` |

---

## Constraints

- Max 1 evidence per service
- Only allowed when service is `IN_TRANSIT`
- Optional (courier can be in IN_TRANSIT without evidence, but cannot DELIVER without it)

---

## Files

```
src/features/evidence/
├── api/evidenceApi.ts
├── components/
│   └── EvidenceCapture.tsx
├── hooks/useEvidence.ts
└── types/evidence.types.ts
```

---

## Flow

```
Service IN_TRANSIT → "Take Photo" button visible
  └── Request camera permission
        ├── Denied → show permission message
        └── Granted → open camera
              └── Photo captured → upload to /evidence
                    ├── Success → hide "Take Photo", show thumbnail, enable "Mark Delivered"
                    └── Failure → show error, allow retry
```

---

## Completion Criteria

- [ ] "Take Photo" only visible when service is IN_TRANSIT
- [ ] Camera permission requested before opening camera
- [ ] Permission denial shows explanatory message
- [ ] Successful upload enables "Mark Delivered"
- [ ] After upload, thumbnail shown and "Take Photo" hidden
- [ ] Upload failure allows retry
