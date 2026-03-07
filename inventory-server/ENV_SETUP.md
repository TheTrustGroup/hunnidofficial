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

Set a comma-separated list of POS cashier emails and one shared password. Each email must have a row in `user_scopes` with one warehouse so the app can bind the session to that store.

```env
ALLOWED_POS_EMAILS=hcashier@hunnidofficial.com,jcashier@hunnidofficial.com
POS_PASSWORD=YourSharedPosPassword
```

- Any email in `ALLOWED_POS_EMAILS` (and not in `ALLOWED_ADMIN_EMAILS`) can log in with `POS_PASSWORD` and gets role `cashier`.
- Warehouse is resolved from the `user_scopes` table (one warehouse per cashier = auto-bound to that store).

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
| `POS_PASSWORD`                   | Shared password for ALLOWED_POS_EMAILS     | Required when using ALLOWED_POS_EMAILS                   |
| `POS_PASSWORD_CASHIER_MAIN_STORE`| Password for cashier@… (Main Store/DC)     | EDK default when ALLOWED_POS_EMAILS not set             |
| `POS_PASSWORD_MAIN_TOWN`        | Password for maintown_cashier@… (Main Town) | EDK default when ALLOWED_POS_EMAILS not set              |

Redeploy after changing env vars.
