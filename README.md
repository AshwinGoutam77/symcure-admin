

## Latest API data layer

This version keeps the previous Admin Panel UI and direct Laravel API architecture unchanged. The only data-layer change is that all API reads/writes now use TanStack React Query.

- `@tanstack/react-query` 5.103.1
- `useAdminQuery` wraps `useQuery`
- `useAdminMutation` wraps `useMutation`
- Admin queries use stable query keys
- Query cache: 5 minutes stale / 30 minutes garbage collection
- Window-focus refetch disabled
- Admin mutations invalidate the `admin` query cache
- Login and admin-session reads also use React Query

Run `npm install` after extracting the ZIP, then `npm run dev`.


## UI / Design system (redesign)

The UI now runs on a single token + component system. See **`docs/DESIGN_SYSTEM.md`**.

- `npm run typecheck` — TypeScript
- `npm run lint:tokens` — fails on hardcoded colours / px font sizes so the UI stays in sync
- Fonts: Inter + JetBrains Mono via `next/font/google` (needs internet at build time)
# symcure-admin
