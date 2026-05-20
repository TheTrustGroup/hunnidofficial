# Go-live checklist (inventory + POS)

Use this before the client records stock and runs sales in production.

## Vercel env (must be set)

### Frontend project (`warehouse-pos` / `warehouse.hunnidofficial.com`)

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `https://api.hunnidofficial.com` | Yes — no trailing slash |

### API project (`inventory-server` / `api.hunnidofficial.com`)

| Variable | Required |
|----------|----------|
| `SESSION_SECRET` | Yes |
| `SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `ALLOWED_ADMIN_EMAILS` | Yes |
| `POS_PASSWORD_CASHIER_MAIN_STORE` | Yes (jcashier login) |
| `POS_PASSWORD_MAIN_TOWN` | Yes (hcashier login) |
| `ALLOW_LEGACY_TRANSACTION_POST` | **No** — leave unset (legacy POST disabled) |

Redeploy **both** projects after changing env vars.

## Deploy (clean build)

From repo root:

```bash
cd warehouse-pos && rm -rf dist && npm ci && npm run build
cd ../inventory-server && rm -rf .next && npm ci && npm run build
```

Production: push `main` or redeploy both Vercel projects. Bump `warehouse-pos/public/service-worker.js` → `CACHE_VERSION` on each frontend production deploy.

## Production smoke (5 minutes)

```bash
# API up
curl -s https://api.hunnidofficial.com/api/health
# Expect: "status":"ok"

# CORS for warehouse UI
curl -sI -X OPTIONS https://api.hunnidofficial.com/api/products \
  -H "Origin: https://warehouse.hunnidofficial.com" \
  -H "Access-Control-Request-Method: GET"
# Expect: access-control-allow-origin: https://warehouse.hunnidofficial.com
```

In the browser (logged in as admin or cashier):

1. **Inventory** — Add or edit a product; confirm quantity saves and reload persists.
2. **POS** — Ring one small sale; confirm success screen and stock decreases in Inventory.
3. **Reports** — Sale appears in revenue (SQL report via `GET /api/reports/sales`).
4. **Sales History** — Receipt listed; void only if you intend to test void.

## Data path (single write path)

- Checkout: `POST /api/sales` → `sales` + `sale_lines` (with `cost_price` at sale time).
- Legacy `POST /api/transactions` is **off** unless you temporarily re-enable the env var.

## If something fails

| Symptom | Check |
|---------|--------|
| Login fails | API env passwords; email prefix (`jcashier@`, `hcashier@`, `admin@`) |
| Products empty / 404 | `VITE_API_BASE_URL` on frontend; API project Root Directory = `inventory-server` |
| Sale succeeds but no stock change | Network tab: must be `POST /api/sales` 2xx, not `/api/transactions` |
| CORS error | Frontend origin in API `ALLOWED_ORIGINS` or default `warehouse.hunnidofficial.com` |

See [CANONICAL.md](../CANONICAL.md), [inventory-server/docs/SALES_API.md](../inventory-server/docs/SALES_API.md).
