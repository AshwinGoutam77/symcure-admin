# Symcure Admin Panel API Integration

This project calls the existing Laravel API directly from the browser. No Next.js API/BFF/proxy routes are used.

## API base

`NEXT_PUBLIC_API_BASE_URL=https://symcure.myclientwebsite.com/api/v1`

## Authentication

Admin login uses the existing endpoint:

`POST /auth/admin/login`

Body:

```json
{ "login": "mobile-or-email", "password": "password", "device_id": "admin-web" }
```

The returned `access_token` is stored in browser localStorage and sent as:

`Authorization: Bearer <access_token>`

All admin calls use the existing `/admin/*` endpoints from the supplied API contract.

## Important: CORS

Because the browser calls the Laravel API directly, the Laravel server must allow the admin panel origin. For local development that is typically `http://localhost:3000`.

The API must answer the preflight request with appropriate headers including `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` (including `Authorization` and `Content-Type`).

This cannot be fixed from React/Next.js when direct browser-to-API calls are required.
