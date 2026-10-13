# Admin panel — API contract update

## New pages
| Route | What it does | Menu key |
|---|---|---|
| `/masters/[resource]` | All 9 masters (medicines, diagnoses, symptoms, lab tests, colleges, degrees, medical councils, specializations, qualification specializations). Form fields come from `GET /admin/masters`, with built-in fallbacks. Full edit of every field, `is_common` switch, activate/deactivate, `DUPLICATE_ENTRY` → reactivate existing. | resource key |
| `/lookup-options` | Grouped dropdown items: add / edit / sort / activate. No delete, no new groups. | `lookup_options` |
| `/imports` | CSV upload per master, sample template, result counts, import history + file download (uploader filter for super admin). | `imports` |
| `/states`, `/districts`, `/cities` | Location CRUD. Delete disabled when `in_use`; 409 `RECORD_IN_USE` offers "Deactivate instead". | `states` / `districts` / `cities` |
| `/patient-search-logs` | Searches, filters, "No results only", CSV export. | `patient_search_logs` |
| `/menus` | Menu tree: edit name/slug/icon/order/parent/allowed actions, status, delete. | super admin |
| `/app-content` | Static pages: add, edit HTML body with preview, publish/hide. | `app_content` |
| `/seasonal-health` | Tips CRUD. | `seasonal_health` |
| `/account` | Own profile + change password (account menu → My account). | any admin |

## Updated pages
- **Doctor detail** — documents tab (view via URL endpoint, upload, delete, current/older/from-application badges), profile photo, medical council name, serial token mode + token start, Delete doctor (`DOCTOR_HAS_LIVE_APPOINTMENTS` → suspend instead), permission gating, error toasts.
- **Patient detail** — Suspend/Reactivate and Delete for app accounts (`NOT_APP_ACCOUNT`, `PATIENT_HAS_LIVE_APPOINTMENTS`).
- **Application detail** — Delete (soft delete).
- **System users** — rewritten: create, edit (role change logs the user out), activate/deactivate, reset password, delete; self/protected rules.
- **Roles** — rewritten: add, edit, activate/deactivate, delete (`ROLE_IN_USE`, `ROLE_PROTECTED`), link to the permission grid (`/role-permission?role_id=`).
- **Audit log** — row click opens before/after detail; Export CSV (`activity_logs.export`).
- **Settings** — all 11 system keys and 7 payment keys; removed the non-contract `/admin/app-settings` call.
- **Sidebar** — permission keys on every item and sub-item; new Master Data / Locations / App Content groups.

## Removed
- `/prescriptions/[id]` (dummy data; the admin panel shows no prescription data).
- Old per-master import pages and preview pages — their URLs redirect to `/imports` and `/masters/...`.
- Old import response fields (`records_inserted`, `records_skipped_existing`).

## Shared code
- `components/admin/kit.tsx` — modal, confirm dialog, list card, filters, pagination footer, form field, switch.
- `hooks/use-permission.ts` — `usePermission("menu_key")` → `{ view, add, edit, delete, export, isSuperAdmin }`.
- `lib/api/errors.ts` — readable messages for API error codes (incl. 403 `PERMISSION_DENIED`).
- `lib/list.ts` — one normaliser for paginated list responses.
- `lib/masters.ts` — master resource config + discovery parser.
- `adminDownload()` in `lib/api/client.ts` — token-authenticated file downloads.

## Assumed menu keys — check against GET /admin/me
`system_settings`, `payment_settings`, `app_content`, `seasonal_health`, `lookup_options`, `menus`, `app_search_keywords`.
If any differ, change the key in `components/main-nav.tsx` and the `usePermission(...)` call on that page.
