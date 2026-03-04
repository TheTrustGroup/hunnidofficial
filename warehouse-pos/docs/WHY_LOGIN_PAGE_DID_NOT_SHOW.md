# Why the login page didn’t show when the client opened the link

## What happened

You shared **https://warehouse.hunnidofficial.com** with your client. When they opened it, they went **straight to the dashboard** and never saw the login page.

## Root cause (precise)

**The client’s browser already had a valid session for this app.**

The warehouse app does **not** show the login page when it detects an existing, valid session. That’s by design: returning users and refreshed tabs go straight to the app. So if the browser had a valid session, the app correctly skipped login and showed the dashboard.

Session is established in two ways, both **persistent in that browser**:

1. **Session cookie**  
   On login, the API sets an `HttpOnly`, `SameSite=Lax`, `Secure` session cookie (no `Domain` set, so it’s tied to the API host). Any later request from that browser to the same API (e.g. from warehouse.hunnidofficial.com with `credentials: 'include'`) sends that cookie. If the cookie is still valid, `/admin/api/me` returns 200 and the app treats the user as logged in.

2. **localStorage**  
   The frontend also stores `auth_token` and `current_user` in **localStorage** for the origin **https://warehouse.hunnidofficial.com**. That storage is per-origin and persists until logout or explicit clear. On load, `AuthContext.checkAuthStatus()` uses that token (and cookie) to call `/admin/api/me`; if the API returns 200, the app sets the user and shows the dashboard.

So “login page didn’t show” happens when, in **that same browser** (and profile), either:

- The **client** had already logged in before and never logged out, or  
- **Someone else** (e.g. you) had logged in on that device/browser and the client opened the link there.

There is no code path that shows the dashboard without a successful session check: `isAuthenticated` is `!!user`, and `user` is set only after a 200 from `/admin/api/me` (or after a successful login). So the only explanation is an **existing valid session** in that browser.

## Summary

| Observation              | Cause                                                                 |
|--------------------------|-----------------------------------------------------------------------|
| Login page didn’t show   | App saw a valid session (cookie and/or token + `/admin/api/me` 200).  |
| Why session was valid    | Same browser had previously logged in and not logged out.            |
| Where it’s stored        | Session cookie (API host) + localStorage (warehouse.hunnidofficial.com). |

## What to do when sharing the link

1. **If the client should see the login page (first time or different user)**  
   - Ask them to open the link in a **private/incognito window**, or  
   - In a browser/profile where they have **never** logged in to warehouse.hunnidofficial.com, or  
   - Have them go to **https://warehouse.hunnidofficial.com**, click **Log out** (if they see the dashboard), then use the same link again so they get the login page.

2. **If the client already had an account and had logged in before**  
   Then going straight to the dashboard is expected: the app is restoring their session.

3. **Optional product improvement**  
   Add a “Sign in as different user” (or similar) on the login page when the user is already authenticated: it clears session and stays on `/login` so they can enter another account. That doesn’t change the “first click” behavior; it only helps when they explicitly open the login page while already logged in.

## References in code

- Session check on load: `src/contexts/AuthContext.tsx` → `checkAuthStatus()` (calls `/admin/api/me` or `/api/auth/user`; sets `user` only on 200).
- `isAuthenticated`: `!!user` in `AuthContext.tsx`.
- Protected routes: `App.tsx` → `ProtectedRoutes` redirects to `/login` only when `!isAuthenticated` or `authError`.
- Session cookie: `inventory-server/lib/auth/session.ts` → `setSessionCookie`; `getSession` uses Bearer token or cookie.
- Token storage: `src/lib/api.ts` → `getAuthToken()` reads `localStorage`; login flow in `AuthContext` writes `auth_token` and `current_user`.
