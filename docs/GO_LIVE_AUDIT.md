# Hunnid Official — Go-live audit (warehouse + API)

Last updated: 2026-05-21. Use this checklist before daily operations.

## Architecture (single truth)

- **Database:** Supabase project `HunnidOfficial` — one Postgres schema.
- **API:** `inventory-server` deployed at `https://api.hunnidofficial.com`.
- **App:** `warehouse-pos` at `https://warehouse.hunnidofficial.com`.
- **Do not** point the app at a legacy external API; `VITE_API_BASE_URL` = API origin only.

## Environment (Vercel / production)

| App | Variable | Required |
|-----|----------|----------|
| warehouse-pos | `VITE_API_BASE_URL` | Yes → `https://api.hunnidofficial.com` |
| warehouse-pos | `VITE_SUPABASE_URL` | Yes (Storage uploads from browser) |
| warehouse-pos | `VITE_SUPABASE_ANON_KEY` | Yes |
| warehouse-pos | `VITE_POS_SALE_OUTBOX` | Default `true` — offline sale queue |
| warehouse-pos | `VITE_OFFLINE_ENABLED` | `true` for full inventory offline sync |
| inventory-server | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Yes |

## End-to-end flows

### Inventory list

- [ ] Login → select **Main Jeff** → Inventory shows ~177 SKUs, sizes on cards, thumbnails.
- [ ] `GET /api/products?warehouse_id=…&view=list&limit=50` returns 200 in &lt;30s.
- [ ] Hard refresh on desktop shows images (clear site data once after deploy if needed).

### Add / edit product

- [ ] Add product with photo → image uploads to `product-images` (not “local only” warning).
- [ ] Sized product saves with `quantityBySize` → sizes visible on card and POS.
- [ ] Edit stock inline or via modal → persists after refresh.

### POS sale

- [ ] Scan/search → add to cart → charge → **RCP-…** receipt from server.
- [ ] Stock decreases in Inventory and POS after sale.
- [ ] Receipt print + download show same receipt no., Ghana date, GH₵, line items, discount, Mix breakdown if used.

### Offline sale

- [ ] With network off (or API blocked), complete sale → “saved on device” + `PENDING-…` on receipt.
- [ ] Back online → sale syncs → real `RCP-…` in Sales history; stock deducted once (idempotency).

### Sales history / deliveries

- [ ] Sales history lists today’s sales with correct totals.
- [ ] Pending deliveries filter works if using delivery status.

## Image migration (recommended before heavy desktop use)

```bash
cd inventory-server
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-product-images.mjs --dry-run
# then without --dry-run, optionally --limit=20 per batch
```

After backfill, list API stays fast (http URLs only in SQL).

## Known dual paths (technical debt)

| Area | Paths | Recommendation |
|------|--------|----------------|
| Products API | `/api/products`, `/admin/api/products` | Use `/api/products` for warehouse; remove 404 fallback later |
| Docs | `docs/` and `warehouse-pos/docs/` | Prefer repo root `docs/` for ops |
| Archive | `_archive/` | Not deployed; ignore for runtime |

## Resilience features in app

- Product list: RPC + fallbacks, 28s timeout, cache without base64 blobs.
- POS: 125s sale timeout, idempotent `client_event_id`, offline outbox (default on).
- Network: `OfflineSyncBootstrap` starts sale sync + inventory sync queue when logged in.
- Receipts: shared `receiptHtml.ts` for print + download; pending-sync banner on receipt.

## Smoke scripts

```bash
cd inventory-server && node scripts/health-check.mjs
cd inventory-server && node scripts/smoke-api.mjs   # if configured
```

## Support contacts

- Supabase: migrations under `inventory-server/supabase/migrations/`
- Receipt / sale issues: verify `record_sale` RPC exists (`20250228170000_sales_sold_by_email.sql`)
