# Phase 01 — Authentication

## Overview

Implement secure login, logout, and automatic token refresh for the courier app. The session is persisted via Expo SecureStore and attached to every API request through an Axios interceptor.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/logout` | Revoke tokens and clear session |
| POST | `/api/auth/refresh` | Rotate refresh token (single-use) |

---

## State (Zustand — authStore)

```ts
interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}
```

---

## Files

```
src/features/auth/
├── api/authApi.ts
├── components/
├── hooks/useLogin.ts
├── screens/LoginScreen.tsx
├── store/authStore.ts
└── types/auth.types.ts
src/core/api/apiClient.ts        ← interceptors live here
src/core/storage/secureStorage.ts
```

---

## Flow

```
LoginScreen
  └── useLogin hook
        └── authApi.login(email, password)
              └── POST /api/auth/login
                    ├── 200 → setAuth(user, token) → navigate Dashboard
                    ├── 401 → show "Invalid credentials"
                    └── 429 → show "Too many attempts", disable 60s
```

---

## Token Refresh Flow

```
Any API request → 401
  └── Token_Manager (Axios interceptor)
        └── POST /api/auth/refresh
              ├── 200 → update token → retry original request
              └── 401 → logout() → navigate Login
```

---

## Validation Rules

- Email: valid format required
- Password: minimum 6 characters
- Submit button disabled while request in flight

---

## Completion Criteria

- [ ] Login screen renders with email + password fields
- [ ] Successful login navigates to Dashboard
- [ ] 401 shows error without clearing email field
- [ ] 429 disables submit for 60 seconds
- [ ] Token persisted in SecureStore
- [ ] Token attached to all subsequent requests
- [ ] Auto-refresh on 401 works and retries original request
- [ ] Logout clears all session data
