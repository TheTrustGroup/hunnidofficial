#!/usr/bin/env node
/**
 * One-time: upload base64 product images to Supabase Storage (product-images) and replace DB URLs.
 *
 * Usage (from inventory-server/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-product-images.mjs
 *   node scripts/backfill-product-images.mjs --dry-run
 *   node scripts/backfill-product-images.mjs --limit 20
 */
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024;
const BATCH = 10;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

function isDataUrl(s) {
  return typeof s === 'string' && s.startsWith('data:image/');
}

function isHttpUrl(s) {
  return typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'));
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1].toLowerCase();
  const buf = Buffer.from(m[2], 'base64');
  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/gif'
          ? 'gif'
          : 'jpg';
  return { contentType, buf, ext };
}

async function uploadDataUrl(productId, dataUrl, index) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Invalid data URL');
  if (parsed.buf.length > MAX_BYTES) throw new Error(`Image too large (${parsed.buf.length} bytes)`);
  const path = `products/${productId}-${index}-${Date.now()}.${parsed.ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, parsed.buf, {
    contentType: parsed.contentType,
    upsert: false,
  });
  if (error) throw error;
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  const { data: rows, error } = await db
    .from('warehouse_products')
    .select('id, sku, name, images')
    .order('name');
  if (error) throw error;

  const targets = (rows ?? []).filter((r) => {
    const imgs = Array.isArray(r.images) ? r.images : [];
    return imgs.some(isDataUrl);
  });

  const slice = limit > 0 ? targets.slice(0, limit) : targets;
  console.log(`Found ${targets.length} products with base64 images; processing ${slice.length}${dryRun ? ' (dry-run)' : ''}`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < slice.length; i += BATCH) {
    const chunk = slice.slice(i, i + BATCH);
    for (const row of chunk) {
      const id = row.id;
      const raw = Array.isArray(row.images) ? row.images : [];
      const next = [];
      let changed = false;
      for (let j = 0; j < raw.length; j++) {
        const src = raw[j];
        if (isHttpUrl(src)) {
          next.push(src);
          continue;
        }
        if (!isDataUrl(src)) continue;
        changed = true;
        if (dryRun) {
          next.push('https://example.com/dry-run-placeholder.jpg');
          continue;
        }
        try {
          const publicUrl = await uploadDataUrl(id, src, j);
          next.push(publicUrl);
        } catch (e) {
          console.error(`  FAIL ${row.sku ?? id}:`, e.message ?? e);
          fail++;
          next.push(src);
        }
      }
      if (!changed) {
        skip++;
        continue;
      }
      if (dryRun) {
        console.log(`  [dry-run] would update ${row.sku ?? id} → ${next.length} url(s)`);
        ok++;
        continue;
      }
      const { error: upErr } = await db.from('warehouse_products').update({ images: next }).eq('id', id);
      if (upErr) {
        console.error(`  FAIL update ${row.sku ?? id}:`, upErr.message);
        fail++;
      } else {
        console.log(`  OK ${row.sku ?? id}`);
        ok++;
      }
    }
  }

  console.log(`Done. updated=${ok} skipped=${skip} failed=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
