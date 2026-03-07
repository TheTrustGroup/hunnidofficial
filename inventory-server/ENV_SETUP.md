# Environment setup (inventory-server)

## 1. Copy the example env

```bash
cp .env.local.example .env.local
```

## 2. Set RBAC variables

### SESSION_SECRET

- **Production:** Generate a random secret (min 16 characters). Example:
  ```bash
  openssl rand -hex 24
  ```
  Paste the output into `SESSION_SECRET` in `.env.local`. Never commit this file.

- **Local dev:** If you leave it empty, the app uses a default dev secret (not safe for production).

### ALLOWED_ADMIN_EMAILS

- Comma-separated list of emails that get **admin** role. Everyone else gets their role from the email prefix (e.g. `cashier@extremedeptkidz.com` → cashier).

Example:

```env
ALLOWED_ADMIN_EMAILS=info@extremedeptkidz.com
```

If you don’t set this, **`info@extremedeptkidz.com`** is still treated as admin by default so admin credentials remain unchanged.

### POS logins (store cashiers)

**Option A — Hunnid / custom stores (recommended when using your own cashier emails):**

Set a comma-separated list of POS cashier emails. Each email must have a row in `user_scopes` with one warehouse so the app can bind the session to that store.

**Per-user passwords (recommended):** Create each cashier in Supabase Auth with their own password. Set the anon key so the server validates against Supabase:

```env
ALLOWED_POS_EMAILS=hcashier@hunnidofficial.com,jcashier@hunnidofficial.com
SUPABASE_ANON_KEY=your_supabase_anon_key
# or NEXT_PUBLIC_SUPABASE_ANON_KEY
```

- The login API calls Supabase `signInWithPassword` for emails in `ALLOWED_POS_EMAILS`. Each cashier uses the password you set for them in Supabase Auth.
- **Fallback:** If you do not set `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, set `POS_PASSWORD` and all listed POS emails will use that single shared password.

**Option B — EDK default (when ALLOWED_POS_EMAILS is not set):**

Only the two hardcoded EDK POS accounts work, each with its own env password.

```env
POS_PASSWORD_CASHIER_MAIN_STORE=MEDk-1!@#
POS_PASSWORD_MAIN_TOWN=TEDk-2!@#
```

- **Main Store/DC:** `cashier@extremedeptkidz.com` → password must match `POS_PASSWORD_CASHIER_MAIN_STORE`.
- **Main Town:** `maintown_cashier@extremedeptkidz.com` → password must match `POS_PASSWORD_MAIN_TOWN`.

If either is unset, login for that POS account will fail with “Invalid email or password”.

## 3. Set Supabase (and optional CORS)

Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Optionally set `CORS_ORIGINS` or `FRONTEND_ORIGIN` if your frontend is on a different origin.

## 4. Vercel (or other host)

In the project’s environment variables, add:

| Name                             | Value                                      | Notes                                                    |
|----------------------------------|--------------------------------------------|----------------------------------------------------------|
| `SESSION_SECRET`                 | Output of `openssl rand -hex 24`           | Required in production                                  |
| `ALLOWED_ADMIN_EMAILS`           | Your admin email(s), comma-separated       | Required for admin role                                  |
| `ALLOWED_POS_EMAILS`             | POS cashier emails, comma-separated        | For Hunnid/custom stores (e.g. hcashier@…, jcashier@…)   |
| `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | When set, POS logins use each cashier’s Supabase Auth password |
| `POS_PASSWORD`                   | Shared password for ALLOWED_POS_EMAILS     | Fallback when anon key is not set                        |
| `POS_PASSWORD_CASHIER_MAIN_STORE`| Password for cashier@… (Main Store/DC)     | EDK default when ALLOWED_POS_EMAILS not set             |
| `POS_PASSWORD_MAIN_TOWN`        | Password for maintown_cashier@… (Main Town) | EDK default when ALLOWED_POS_EMAILS not set              |

Redeploy after changing env vars.

## 5. Login 401 / "Invalid email or password" (API project)

These env vars must be set on the **project that serves the API** (e.g. the Vercel project for `api.hunnidofficial.com`), not only on the frontend:

1. **ALLOWED_POS_EMAILS** — Must include every cashier email that should be able to log in, e.g.  
   `hcashier@hunnidofficial.com,jcashier@hunnidofficial.com`  
   If this is missing or doesn’t include an email, that user is never treated as a POS user and login returns 401.

2. **SUPABASE_URL** and **SUPABASE_ANON_KEY** — Must be from the **same** Supabase project where those users exist (e.g. HunnidOfficial). Get them from Supabase → Project Settings → API (Project URL and anon public key). Redeploy after adding or changing them.

3. **Optional fallback:** Set **POS_PASSWORD** to a single shared password; then cashiers can also sign in with that if Supabase sign-in fails.
