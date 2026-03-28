/**
 * Warehouse products list and create. List response includes images for POS/Inventory.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeQuantityBySizeForApi } from '../../../src/lib/sizeCode';

export interface ListOptions {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string;
  /** Filter to products that have this size (in warehouse_inventory_by_size for the warehouse). */
  sizeCode?: string;
  /** Filter to products with this color (case-insensitive match). */
  color?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export interface ListResult {
  data: ListProduct[];
  total: number;
}

export interface ListProduct {
  id: string;
  warehouseId: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string;
  /** Product color for filter (e.g. Red, Black). Null when not set. */
  color: string | null;
  sizeKind: string;
  sellingPrice: number;
  costPrice: number;
  reorderLevel: number;
  quantity: number;
  quantityBySize: Array<{ sizeCode: string; sizeLabel?: string; quantity: number }>;
  location: unknown;
  supplier: unknown;
  tags: unknown[];
  images: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Alias for ListProduct (dashboard stats and other consumers). */
export type ProductRecord = ListProduct;

export interface PutProductBody {
  id?: string;
  warehouseId?: string;
  warehouse_id?: string;
  sku?: string;
  name?: string;
  category?: string;
  sellingPrice?: number;
  costPrice?: number;
  sizeKind?: string;
  quantity?: number;
  quantityBySize?: Array<{ sizeCode: string; quantity: number }>;
  images?: string[];
  color?: string | null;
  [key: string]: unknown;
}

function getDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Turn DB constraint errors into clear 400-style messages for the client. */
function normalizeDbConstraintError(dbMessage: string, action: 'create' | 'update'): string {
  const notNullMatch = dbMessage.match(/null value in column "([^"]+)" of relation "[^"]+" violates not-null constraint/i);
  if (notNullMatch) {
    const col = notNullMatch[1];
    const field =
      col === 'barcode' ? 'Barcode' : col === 'description' ? 'Description' : col === 'name' ? 'Product name' : col.replace(/_/g, ' ');
    return `Product ${action}: ${field} is required.`;
  }
  return `Failed to ${action} product: ${dbMessage}`;
}

function isInvalidWarehouseId(value: string): boolean {
  const w = String(value ?? '').trim();
  if (!w) return true;
  return w === '00000000-0000-0000-0000-000000000000';
}

/**
 * Columns for warehouse_products when table has no warehouse_id (one row per product).
 * Quantity is resolved from warehouse_inventory / warehouse_inventory_by_size per warehouse.
 */
const WAREHOUSE_PRODUCTS_SELECT =
  'id, sku, barcode, name, description, category, color, size_kind, selling_price, cost_price, reorder_level, location, supplier, tags, images, version, created_at, updated_at';

/** One-size placeholders; must not be written to warehouse_inventory_by_size when product is sized. */
const PLACEHOLDER_SIZE_CODES = new Set(['OS', 'ONESIZE', 'ONE_SIZE', 'O/S', 'NA']);

/** Sum quantities when the same size_code appears twice (duplicate rows / retries). */
function mergeQuantityBySizeRows(rows: Array<{ sizeCode: string; quantity: number }>): Array<{ sizeCode: string; quantity: number }> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r.sizeCode ?? '').trim().toUpperCase();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + Math.max(0, Number(r.quantity) || 0));
  }
  return [...m.entries()].map(([sizeCode, quantity]) => ({ sizeCode, quantity }));
}

/** List products for a warehouse. Works when warehouse_products has no warehouse_id (one row per product).
 * When warehouseId is set, only returns products that have inventory at that warehouse (so Hunnid Main never shows Main Jeff products and vice versa). */
export async function getWarehouseProducts(
  warehouseId: string | undefined,
  options: ListOptions = {}
): Promise<ListResult> {
  const db = getDb();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 2000);
  const offset = Math.max(options.offset ?? 0, 0);
  const effectiveWarehouseId = warehouseId ?? '';

  // Restrict to products that exist at this warehouse (warehouse_inventory or warehouse_inventory_by_size).
  let warehouseProductIds: string[] | null = null;
  if (effectiveWarehouseId) {
    const { data: invRows } = await db
      .from('warehouse_inventory')
      .select('product_id')
      .eq('warehouse_id', effectiveWarehouseId);
    const { data: sizeRows } = await db
      .from('warehouse_inventory_by_size')
      .select('product_id')
      .eq('warehouse_id', effectiveWarehouseId);
    const fromInv = new Set((invRows ?? []).map((r: { product_id: string }) => r.product_id));
    const fromSize = new Set((sizeRows ?? []).map((r: { product_id: string }) => r.product_id));
    warehouseProductIds = [...new Set([...fromInv, ...fromSize])];
    if (warehouseProductIds.length === 0) {
      return { data: [], total: 0 };
    }
  }

  let query = db
    .from('warehouse_products')
    .select(WAREHOUSE_PRODUCTS_SELECT, { count: 'exact' })
    .order('name')
    .range(offset, offset + limit - 1);

  if (warehouseProductIds !== null) {
    query = query.in('id', warehouseProductIds);
  }

  if (options.q?.trim()) {
    const raw = options.q.trim();
    const q = raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
  }
  if (options.category?.trim()) {
    query = query.eq('category', options.category.trim());
  }
  if (options.color?.trim()) {
    const colorVal = options.color.trim();
    if (colorVal.toLowerCase() === 'uncategorized') {
      // Show products with no color set (existing products before color was added).
      query = query.is('color', null);
    } else {
      // Case-insensitive: ilike with no wildcards matches exact string, any case (e.g. Black matches black).
      query = query.ilike('color', colorVal);
    }
  }

  // When filtering by size, restrict to product IDs that have this size in this warehouse.
  let sizeFilterProductIds: string[] | null = null;
  if (options.sizeCode?.trim() && effectiveWarehouseId) {
    const { data: sizeRows } = await db
      .from('warehouse_inventory_by_size')
      .select('product_id')
      .eq('warehouse_id', effectiveWarehouseId)
      .eq('size_code', options.sizeCode.trim());
    sizeFilterProductIds = [...new Set((sizeRows ?? []).map((r: { product_id: string }) => r.product_id))];
    if (sizeFilterProductIds.length === 0) {
      return { data: [], total: 0 };
    }
    query = query.in('id', sizeFilterProductIds);
  }

  const { data: rows, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list products: ${error.message}`);
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  const productIds = list.map((r) => r.id as string);

  const invMap: Record<string, number> = {};
  const sizeMap: Record<string, Array<{ sizeCode: string; sizeLabel?: string; quantity: number }>> = {};

  if (effectiveWarehouseId && productIds.length > 0) {
    const { data: invRows } = await db
      .from('warehouse_inventory')
      .select('product_id, quantity')
      .eq('warehouse_id', effectiveWarehouseId)
      .in('product_id', productIds);
    for (const inv of invRows ?? []) {
      const r = inv as { product_id: string; quantity?: number };
      invMap[r.product_id] = Number(r.quantity ?? 0);
    }
    const { data: sizeRows } = await db
      .from('warehouse_inventory_by_size')
      .select('product_id, size_code, quantity')
      .eq('warehouse_id', effectiveWarehouseId)
      .in('product_id', productIds);
    const sizeList = (sizeRows ?? []) as Array<{ product_id: string; size_code: string; quantity: number }>;
    for (const r of sizeList) {
      if (!sizeMap[r.product_id]) sizeMap[r.product_id] = [];
      const code = String(r.size_code ?? '').trim();
      if (!code) continue;
      sizeMap[r.product_id].push({
        sizeCode: code,
        sizeLabel: code,
        quantity: Number(r.quantity ?? 0),
      });
    }
  }

  const data = list.map((row) => {
    const sizes = (sizeMap[row.id as string] ?? []).sort((a, b) =>
      a.sizeCode.localeCompare(b.sizeCode)
    );
    const isSized = (row.size_kind as string) === 'sized' && sizes.length > 0;
    const quantity = isSized
      ? sizes.reduce((s, r) => s + r.quantity, 0)
      : invMap[row.id as string] ?? 0;

    if (options.lowStock && quantity > (Number(row.reorder_level ?? 0) || 3)) return null;
    if (options.outOfStock && quantity > 0) return null;

    return {
      id: String(row.id ?? ''),
      warehouseId: effectiveWarehouseId,
      sku: String(row.sku ?? ''),
      barcode: row.barcode ?? null,
      name: String(row.name ?? ''),
      description: row.description ?? null,
      category: String(row.category ?? ''),
      color: row.color != null ? String(row.color).trim() || null : null,
      sizeKind: String(row.size_kind ?? 'na'),
      sellingPrice: Number(row.selling_price ?? 0),
      costPrice: Number(row.cost_price ?? 0),
      reorderLevel: Number(row.reorder_level ?? 0),
      quantity,
      quantityBySize: sizes,
      location: row.location ?? null,
      supplier: row.supplier ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      images: Array.isArray(row.images) ? (row.images as string[]) : [],
      version: Number(row.version ?? 0),
      createdAt: String(row.created_at ?? ''),
      updatedAt: String(row.updated_at ?? ''),
    };
  }).filter((p) => p !== null) as ListProduct[];

  return { data, total: count ?? data.length };
}

/** Get one product by id and warehouse (for GET ?id=). Works when warehouse_products has no warehouse_id. */
export async function getProductById(
  warehouseId: string,
  productId: string
): Promise<ListProduct | null> {
  const db = getDb();
  const { data: row } = await db
    .from('warehouse_products')
    .select(WAREHOUSE_PRODUCTS_SELECT)
    .eq('id', productId)
    .single();

  if (!row) return null;

  const r = row as Record<string, unknown>;

  let quantity = 0;
  const { data: invRow } = await db
    .from('warehouse_inventory')
    .select('quantity')
    .eq('warehouse_id', warehouseId)
    .eq('product_id', productId)
    .maybeSingle();
  const { data: sizeRows } = await db
    .from('warehouse_inventory_by_size')
    .select('size_code, quantity')
    .eq('warehouse_id', warehouseId)
    .eq('product_id', productId);
  const sizes = ((sizeRows ?? []) as Array<{ size_code: string; quantity: number }>)
    .filter((s) => String(s.size_code ?? '').trim())
    .map((s) => {
      const code = String(s.size_code).trim();
      return { sizeCode: code, sizeLabel: code, quantity: Number(s.quantity ?? 0) };
    })
    .sort((a, b) => a.sizeCode.localeCompare(b.sizeCode));
  const isSized = (r.size_kind as string) === 'sized' && sizes.length > 0;
  quantity = isSized ? sizes.reduce((s, x) => s + x.quantity, 0) : Number((invRow as { quantity?: number } | null)?.quantity ?? 0);

  return {
    id: String(r.id ?? ''),
    warehouseId,
    sku: String(r.sku ?? ''),
    barcode: r.barcode != null ? String(r.barcode) : null,
    name: String(r.name ?? ''),
    description: r.description != null ? String(r.description) : null,
    category: String(r.category ?? ''),
    color: r.color != null ? String(r.color).trim() || null : null,
    sizeKind: String(r.size_kind ?? 'na'),
    sellingPrice: Number(r.selling_price ?? 0),
    costPrice: Number(r.cost_price ?? 0),
    reorderLevel: Number(r.reorder_level ?? 0),
    quantity,
    quantityBySize: sizes,
    location: r.location ?? null,
    supplier: r.supplier ?? null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    version: Number(r.version ?? 0),
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  };
}

/** API JSON shape for POST /products create response (matches prior createWarehouseProduct return). */
function listProductToCreateResponse(p: ListProduct): Record<string, unknown> {
  return {
    id: p.id,
    warehouseId: p.warehouseId,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    description: p.description,
    category: p.category,
    color: p.color,
    sizeKind: p.sizeKind,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    reorderLevel: p.reorderLevel,
    quantity: p.quantity,
    quantityBySize: p.quantityBySize,
    location: p.location,
    supplier: p.supplier,
    tags: p.tags,
    images: p.images,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function shouldFallbackCreateProductRpc(err: { message?: string; code?: string; details?: string }): boolean {
  const c = String(err.code ?? '');
  const m = String(err.message ?? err.details ?? '').toLowerCase();
  if (c === 'PGRST202' || c === '42883') return true;
  if (m.includes('could not find the function')) return true;
  if (m.includes('does not exist') && m.includes('function')) return true;
  if (m.includes('schema cache')) return true;
  return false;
}

/**
 * One DB transaction: product + warehouse_inventory + warehouse_inventory_by_size (when sized).
 * Falls back to null when RPC is missing so callers can use the legacy multi-request path.
 */
async function tryCreateWarehouseProductAtomicRpc(
  db: SupabaseClient,
  params: {
    id: string;
    warehouseId: string;
    productRow: Record<string, unknown>;
    now: string;
    isSized: boolean;
    totalQty: number;
    sizedPayload: Array<{ sizeCode: string; quantity: number }>;
    sellingPrice: number;
    costPrice: number;
    reorderLevel: number;
    colorVal: string | null;
    body: Record<string, unknown>;
  }
): Promise<Record<string, unknown> | null> {
  const {
    id,
    warehouseId,
    productRow,
    now,
    isSized,
    totalQty,
    sizedPayload,
    sellingPrice,
    costPrice,
    reorderLevel,
    colorVal,
    body,
  } = params;
  const sk = String(productRow.size_kind ?? 'na');
  const createdBy = String(body.createdBy ?? body.created_by ?? '');
  const pRow = {
    id,
    sku: productRow.sku,
    barcode: productRow.barcode,
    name: productRow.name,
    description: productRow.description,
    category: productRow.category,
    color: colorVal,
    size_kind: sk,
    sizeKind: sk,
    selling_price: sellingPrice,
    sellingPrice,
    cost_price: costPrice,
    costPrice,
    reorder_level: reorderLevel,
    reorderLevel,
    location: body.location ?? null,
    supplier: body.supplier ?? null,
    tags: productRow.tags ?? [],
    images: productRow.images ?? [],
    version: 1,
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
    created_by: createdBy,
    createdBy,
  };

  const { error } = await db.rpc('create_warehouse_product_atomic', {
    p_id: id,
    p_warehouse_id: warehouseId,
    p_row: pRow,
    p_quantity: isSized ? 0 : totalQty,
    p_quantity_by_size: isSized ? sizedPayload : [],
  });

  if (error) {
    if (shouldFallbackCreateProductRpc(error)) return null;
    throw new Error(`Failed to create product: ${error.message}`);
  }

  const fresh = await getProductById(warehouseId, id);
  if (!fresh) {
    throw new Error('Product was created but could not be loaded. Please refresh the inventory list.');
  }
  return listProductToCreateResponse(fresh);
}

/**
 * Create product: insert into warehouse_products, then warehouse_inventory (and warehouse_inventory_by_size when sized).
 * Body may use camelCase (from frontend); we normalize to DB snake_case.
 * Returns the created product in ListProduct shape for client UI.
 *
 * Preferred path: `create_warehouse_product_atomic` RPC (single transaction). Legacy: three REST inserts if RPC unavailable.
 */
export async function createWarehouseProduct(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const db = getDb();

  const warehouseId = String(body.warehouseId ?? body.warehouse_id ?? '').trim();
  if (isInvalidWarehouseId(warehouseId)) {
    throw new Error('warehouseId is required');
  }

  const name = String(body.name ?? '').trim();
  if (!name) {
    throw new Error('Product name is required');
  }

  const id = (typeof body.id === 'string' && body.id.trim() ? body.id.trim() : crypto.randomUUID()) as string;
  const sku = String(body.sku ?? '').trim() || `SKU-${id.slice(0, 8)}`;
  /** DB has NOT NULL on barcode; coerce null/undefined to empty string to avoid constraint violation. */
  const barcode = (body.barcode != null ? String(body.barcode).trim() : '') || '';
  /** DB may have NOT NULL on description; coerce to empty string. */
  const description = (body.description != null ? String(body.description).trim() : '') || '';
  const category = String(body.category ?? 'Uncategorized').trim();
  const sizeKindRaw = String(body.sizeKind ?? body.size_kind ?? 'na').trim().toLowerCase();
  const sizeKind =
    sizeKindRaw === 'multiple' || sizeKindRaw === 'multi' ? 'sized' : sizeKindRaw;
  const sellingPrice = Number(body.sellingPrice ?? body.selling_price ?? 0);
  const costPrice = Number(body.costPrice ?? body.cost_price ?? 0);
  const reorderLevel = Number(body.reorderLevel ?? body.reorder_level ?? 0);
  const quantityBySizeRaw = (
    Array.isArray(body.quantityBySize)
      ? body.quantityBySize
      : Array.isArray(body.quantity_by_size)
        ? body.quantity_by_size
        : []
  ) as Array<{ sizeCode?: string; size_code?: string; quantity?: number }>;
  const quantityBySize = mergeQuantityBySizeRows(sanitizeQuantityBySizeForApi(quantityBySizeRaw));
  const quantity = Number(body.quantity ?? 0);
  const now = new Date().toISOString();

  const colorVal = body.color != null ? String(body.color).trim() || null : null;
  const productRow = {
    id,
    sku,
    barcode,
    name,
    description,
    category,
    color: colorVal,
    size_kind: sizeKind === 'one_size' ? 'one_size' : sizeKind === 'sized' ? 'sized' : 'na',
    selling_price: sellingPrice,
    cost_price: costPrice,
    reorder_level: reorderLevel,
    location: body.location ?? null,
    supplier: body.supplier ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    images: Array.isArray(body.images) ? body.images : [],
    version: 1,
    created_at: now,
    updated_at: now,
  };

  const isSized = sizeKind === 'sized' && quantityBySize.length > 0;
  const sizedPayload = quantityBySize
    .filter((r) => (Number(r.quantity) || 0) > 0)
    .map((r) => ({ sizeCode: String(r.sizeCode).trim(), quantity: Number(r.quantity) || 0 }));

  if (sizeKind === 'sized' && quantityBySize.length === 0) {
    throw new Error('Failed to create inventory by size: add at least one real size (not OS).');
  }
  if (sizeKind === 'sized' && sizedPayload.length === 0) {
    throw new Error(
      'Failed to create inventory by size: enter a quantity greater than 0 for at least one size.'
    );
  }

  const totalQty = isSized
    ? quantityBySize.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
    : Number(quantity) || 0;

  const viaRpc = await tryCreateWarehouseProductAtomicRpc(db, {
    id,
    warehouseId,
    productRow,
    now,
    isSized,
    totalQty,
    sizedPayload,
    sellingPrice,
    costPrice,
    reorderLevel,
    colorVal,
    body,
  });
  if (viaRpc !== null) return viaRpc;

  const { error: insertProductError } = await db.from('warehouse_products').insert(productRow);
  if (insertProductError) {
    throw new Error(normalizeDbConstraintError(insertProductError.message, 'create'));
  }

  /** Per-size rows first: trigger enforce_size_rules runs on warehouse_inventory_by_size only; errors must not be prefixed as warehouse_inventory. */
  const sizeRowsAll =
    isSized && quantityBySize.length > 0
      ? quantityBySize
          .filter((r) => {
            const code = String(r.sizeCode ?? '').trim().toUpperCase().replace(/\s+/g, '');
            return code !== '' && !PLACEHOLDER_SIZE_CODES.has(code);
          })
          .map((r) => ({
            product_id: id,
            warehouse_id: warehouseId,
            size_code: String(r.sizeCode).trim().toUpperCase(),
            quantity: Number(r.quantity) || 0,
          }))
      : [];

  /** Do not insert 0-qty rows: avoids useless DB rows and failures when a UI-only code is not in size_codes. */
  const sizeRows = sizeRowsAll.filter((r) => r.quantity > 0);

  if (isSized && sizeRowsAll.length > 0 && sizeRows.length === 0) {
    await db.from('warehouse_products').delete().eq('id', id);
    throw new Error(
      'Failed to create inventory by size: enter a quantity greater than 0 for at least one size.'
    );
  }

  if (isSized && sizeRows.length > 0) {
    const { error: insertSizeError } = await db.from('warehouse_inventory_by_size').insert(sizeRows);
    if (insertSizeError) {
      await db.from('warehouse_products').delete().eq('id', id);
      throw new Error(`Failed to create inventory by size: ${insertSizeError.message}`);
    }
  }

  const { error: insertInvError } = await db.from('warehouse_inventory').insert({
    product_id: id,
    warehouse_id: warehouseId,
    quantity: totalQty,
  });
  if (insertInvError) {
    if (sizeRows.length > 0) {
      await db.from('warehouse_inventory_by_size').delete().eq('product_id', id).eq('warehouse_id', warehouseId);
    }
    await db.from('warehouse_products').delete().eq('id', id);
    throw new Error(`Failed to create warehouse inventory: ${insertInvError.message}`);
  }

  const quantityBySizeOut = isSized
    ? quantityBySize.map((r) => ({ sizeCode: String(r.sizeCode), sizeLabel: String(r.sizeCode), quantity: Number(r.quantity) || 0 }))
    : [];

  return {
    id,
    warehouseId,
    sku,
    barcode,
    name,
    description,
    category,
    color: productRow.color ?? null,
    sizeKind: productRow.size_kind,
    sellingPrice,
    costPrice,
    reorderLevel,
    quantity: totalQty,
    quantityBySize: quantityBySizeOut,
    location: productRow.location,
    supplier: productRow.supplier,
    tags: productRow.tags,
    images: productRow.images,
    version: productRow.version,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update product: patch warehouse_products, then replace warehouse_inventory and warehouse_inventory_by_size for the given warehouse.
 * Body may use camelCase; only provided fields are updated. Returns updated product in ListProduct shape.
 */
export async function updateWarehouseProduct(
  productId: string,
  warehouseId: string,
  body: PutProductBody
): Promise<ListProduct | null> {
  if (isInvalidWarehouseId(warehouseId)) {
    throw new Error('warehouseId is required');
  }
  const db = getDb();

  const existing = await getProductById(warehouseId, productId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.sku !== undefined) updates.sku = String(body.sku).trim();
  /** DB has NOT NULL on barcode; coerce null to empty string. */
  if (body.barcode !== undefined) updates.barcode = (body.barcode != null ? String(body.barcode).trim() : '') || '';
  /** DB may have NOT NULL on description; coerce to empty string. */
  if (body.description !== undefined) updates.description = (body.description != null ? String(body.description).trim() : '') || '';
  if (body.category !== undefined) updates.category = String(body.category).trim();
  if (body.sizeKind !== undefined) updates.size_kind = String(body.sizeKind).trim().toLowerCase();
  if (body.sellingPrice !== undefined) updates.selling_price = Number(body.sellingPrice);
  if (body.costPrice !== undefined) updates.cost_price = Number(body.costPrice);
  if (body.reorderLevel !== undefined) updates.reorder_level = Number(body.reorderLevel);
  if (body.location !== undefined) updates.location = body.location;
  if (body.supplier !== undefined) updates.supplier = body.supplier;
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.images !== undefined) updates.images = Array.isArray(body.images) ? body.images : [];
  if (body.color !== undefined) updates.color = body.color != null ? String(body.color).trim() || null : null;

  updates.version = (existing.version ?? 0) + 1;

  const { error: updateError } = await db
    .from('warehouse_products')
    .update(updates)
    .eq('id', productId);
  if (updateError) {
    throw new Error(normalizeDbConstraintError(updateError.message, 'update'));
  }

  const sizeKind = String(body.sizeKind ?? existing.sizeKind ?? 'na').toLowerCase();
  // Preserve existing sizes when body.quantityBySize is undefined or explicitly empty (avoid accidental wipe)
  const quantityBySizeRaw = Array.isArray(body.quantityBySize) ? body.quantityBySize : undefined;
  const quantityBySize = mergeQuantityBySizeRows(
    quantityBySizeRaw && quantityBySizeRaw.length > 0
      ? sanitizeQuantityBySizeForApi(quantityBySizeRaw as Array<{ sizeCode: string; quantity: number }>)
      : existing.quantityBySize?.length
        ? sanitizeQuantityBySizeForApi(existing.quantityBySize as Array<{ sizeCode: string; quantity: number }>)
        : []
  );
  const isSized = sizeKind === 'sized' && quantityBySize.length > 0;
  const totalQty = isSized
    ? quantityBySize.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
    : Number(body.quantity ?? existing.quantity ?? 0);

  // Update size rows without delete-all first: upsert then remove orphans so we never wipe data on insert failure.
  if (isSized && quantityBySize.length > 0) {
    const sizeRows = quantityBySize
      .filter((r) => {
        const code = String(r.sizeCode ?? '').trim().toUpperCase().replace(/\s+/g, '');
        return code !== '' && !PLACEHOLDER_SIZE_CODES.has(code);
      })
      .map((r) => ({
        product_id: productId,
        warehouse_id: warehouseId,
        size_code: String(r.sizeCode).trim().toUpperCase(),
        quantity: Number(r.quantity) || 0,
      }));
    if (sizeRows.length > 0) {
      const { error: upsertSizeError } = await db
        .from('warehouse_inventory_by_size')
        .upsert(sizeRows, { onConflict: 'warehouse_id,product_id,size_code' });
      if (upsertSizeError) {
        throw new Error(`Failed to update inventory by size: ${upsertSizeError.message}`);
      }
      const newCodes = sizeRows.map((r) => r.size_code);
      const { data: existingRows } = await db
        .from('warehouse_inventory_by_size')
        .select('size_code')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId);
      const toDelete = (existingRows ?? []).filter(
        (row: { size_code: string }) => !newCodes.includes(String(row.size_code).trim().toUpperCase())
      );
      for (const row of toDelete) {
        await db
          .from('warehouse_inventory_by_size')
          .delete()
          .eq('product_id', productId)
          .eq('warehouse_id', warehouseId)
          .eq('size_code', row.size_code);
      }
    }
  } else {
    await db.from('warehouse_inventory_by_size').delete().eq('product_id', productId).eq('warehouse_id', warehouseId);
  }

  const { error: delInvErr } = await db
    .from('warehouse_inventory')
    .delete()
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId);
  if (delInvErr) {
    throw new Error(`Failed to clear warehouse inventory for update: ${delInvErr.message}`);
  }
  const { error: insertInvErr } = await db.from('warehouse_inventory').insert({
    product_id: productId,
    warehouse_id: warehouseId,
    quantity: totalQty,
  });
  if (insertInvErr) {
    throw new Error(`Failed to update warehouse inventory: ${insertInvErr.message}`);
  }

  return getProductById(warehouseId, productId);
}

/**
 * Delete product: remove all inventory and by-size rows for this product, then delete the product row.
 * Product is removed from every warehouse so it does not reappear on list poll.
 */
export async function deleteWarehouseProduct(productId: string, _warehouseId: string): Promise<void> {
  const db = getDb();

  const { error: delSizeErr } = await db
    .from('warehouse_inventory_by_size')
    .delete()
    .eq('product_id', productId);
  if (delSizeErr) {
    throw new Error(`Failed to delete inventory by size: ${delSizeErr.message}`);
  }

  const { error: delInvErr } = await db
    .from('warehouse_inventory')
    .delete()
    .eq('product_id', productId);
  if (delInvErr) {
    throw new Error(`Failed to delete warehouse inventory: ${delInvErr.message}`);
  }

  const { error: delProdErr } = await db.from('warehouse_products').delete().eq('id', productId);
  if (delProdErr) {
    throw new Error(`Failed to delete product: ${delProdErr.message}`);
  }
}

/** Stub: bulk delete. Implement when needed. */
export async function deleteWarehouseProductsBulk(_ids: string[]): Promise<{ deleted: number }> {
  return { deleted: 0 };
}
