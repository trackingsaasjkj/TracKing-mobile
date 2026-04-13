# Phase 00 — Project Setup

## Overview

Initialize the Expo + TypeScript project with the full folder structure, dependencies, and core configuration required by all subsequent phases.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Expo (SDK 51+) | React Native framework |
| TypeScript | Type safety |
| Axios | HTTP client with interceptors |
| Zustand | Client state management |
| React Navigation v6 | Navigation (stack + bottom tabs) |
| Expo SecureStore | Secure JWT persistence |
| Expo Camera | Evidence photo capture |
| Expo Location | GPS tracking |
| React Query (TanStack) | Server state / caching |
| React Hook Form | Form management |

---

## Folder Structure

```
courier-mobile-app/
├── app.json
├── App.tsx
├── tsconfig.json
├── babel.config.js
├── package.json
└── src/
    ├── app/
    │   ├── navigation/
    │   │   ├── RootNavigator.tsx       # Auth guard + root stack
    │   │   └── TabNavigator.tsx        # Bottom tab navigator
    │   ├── providers/
    │   │   └── AppProviders.tsx        # QueryClient, etc.
    │   └── store/
    │       └── index.ts                # Store barrel export
    ├── core/
    │   ├── api/
    │   │   └── apiClient.ts            # Axios instance + interceptors
    │   ├── storage/
    │   │   └── secureStorage.ts        # Expo SecureStore wrapper
    │   └── hooks/
    │       └── useNetworkStatus.ts     # Connectivity detection
    ├── features/
    │   ├── auth/
    │   │   ├── api/authApi.ts
    │   │   ├── components/
    │   │   ├── hooks/useLogin.ts
    │   │   ├── screens/LoginScreen.tsx
    │   │   ├── store/authStore.ts
    │   │   └── types/auth.types.ts
    │   ├── dashboard/
    │   │   ├── api/dashboardApi.ts
    │   │   ├── components/
    │   │   ├── hooks/useDashboard.ts
    │   │   ├── screens/HomeScreen.tsx
    │   │   └── types/dashboard.types.ts
    │   ├── services/
    │   │   ├── api/servicesApi.ts
    │   │   ├── components/
    │   │   ├── hooks/useServices.ts
    │   │   ├── screens/
    │   │   ├── store/servicesStore.ts
    │   │   └── types/services.types.ts
    │   ├── evidence/
    │   │   ├── api/evidenceApi.ts
    │   │   ├── components/
    │   │   ├── hooks/useEvidence.ts
    │   │   └── types/evidence.types.ts
    │   ├── tracking/
    │   │   ├── api/locationApi.ts
    │   │   ├── hooks/useLocationReporter.ts
    │   │   └── types/tracking.types.ts
    │   ├── workday/
    │   │   ├── api/workdayApi.ts
    │   │   └── hooks/useWorkday.ts
    │   └── earnings/
    │       ├── api/earningsApi.ts
    │       ├── hooks/useEarnings.ts
    │       ├── screens/EarningsScreen.tsx
    │       └── types/earnings.types.ts
    └── shared/
        ├── components/
        │   ├── ErrorState.tsx
        │   ├── LoadingSpinner.tsx
        │   └── NetworkBanner.tsx
        ├── ui/
        │   ├── colors.ts               # Design system tokens
        │   └── typography.ts
        └── utils/
            └── errorHandler.ts
```

---

## Design System Tokens

```ts
// src/shared/ui/colors.ts
export const colors = {
  primary:       '#2563EB',
  primaryLight:  '#3B82F6',
  success:       '#22C55E',
  warning:       '#F59E0B',
  danger:        '#EF4444',
  neutral50:     '#F9FAFB',
  neutral100:    '#F3F4F6',
  neutral800:    '#1F2937',
};

```

---

## API Client Configuration

- Base URL: `http://localhost:3000`
- All requests include `Authorization: Bearer <token>` header
- Request interceptor: attach token from SecureStore
- Response interceptor:
  - On `401`: attempt token refresh via `POST /api/auth/refresh`, retry original request once
  - On refresh failure: clear session, redirect to Login
  - On `429`: surface rate-limit message
  - On `500`: surface generic server error

---

## Navigation Structure

```
RootNavigator
├── AuthStack (unauthenticated)
│   └── LoginScreen
└── MainTabs (authenticated)
    ├── HomeScreen       (tab: Home)
    ├── ServicesScreen   (tab: Orders)
    ├── EarningsScreen   (tab: Earnings)
    └── ProfileScreen    (tab: Profile)
```

---

## Key Dependencies (package.json excerpt)

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-camera": "~15.0.0",
    "expo-location": "~17.0.0",
    "axios": "^1.7.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.51.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/native-stack": "^6.9.0",
    "react-native-safe-area-context": "^4.10.0",
    "react-native-screens": "^3.31.0"
  }
}
```

---

## Completion Criteria

- [ ] Expo project initializes and runs on simulator/device
- [ ] TypeScript compiles without errors
- [ ] Folder structure matches spec
- [ ] Axios client configured with base URL and interceptors
- [ ] SecureStore wrapper functional
- [ ] Navigation renders Login screen when unauthenticated
- [ ] Design tokens defined
