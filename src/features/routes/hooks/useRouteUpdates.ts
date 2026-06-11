/**
 * useRouteUpdates — no-op hook kept for API compatibility.
 *
 * Route WebSocket events (route:assigned, route:updated, route:stop:completed)
 * are now handled in useServiceUpdates, which is always mounted for the
 * duration of the session. This ensures route:assigned is never missed
 * because RouteDetailScreen was not open yet.
 *
 * This hook is intentionally empty. Removing it would require updating
 * useActiveRoute and all test files that import it — keeping the export
 * avoids churn while the architecture is clear.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useRouteUpdates(_routeId?: string): void {
  // Intentionally empty — see comment above
}
