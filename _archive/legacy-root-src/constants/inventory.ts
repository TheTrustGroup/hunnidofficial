/**
 * Shared inventory timing and list constants.
 * Use these instead of magic numbers so tuning is consistent and documented.
 */

/** Poll interval for product list refresh (InventoryPage and InventoryContext). */
export const INVENTORY_POLL_MS = 30_000;

/** Default page size for product list requests. */
export const INVENTORY_PAGE_SIZE = 50;

/** Per-warehouse in-memory cache TTL; after this we refetch from API. */
export const PRODUCTS_CACHE_TTL_MS = 60_000;

/** After a product update, preserve it in the list when loadProducts runs for this long (avoids stale overwrite). */
export const LAST_UPDATED_PRESERVE_MS = 60_000;

/** Throttle silent refresh so poll + visibility + mount don't cause back-to-back requests. */
export const SILENT_REFRESH_THROTTLE_MS = 2_000;

/** Window during which a just-added product is pinned so loadProducts doesn't drop it. */
export const RECENT_ADD_WINDOW_MS = 15_000;

/** Window during which a just-updated product is preferred over list response. */
export const RECENT_UPDATE_WINDOW_MS = 60_000;

/** Window during which deleted ids are kept so in-flight load doesn't re-add them. */
export const RECENT_DELETE_WINDOW_MS = 15_000;

/** After a sized product update, skip silent refresh for this long so API list doesn't overwrite with stale One size. */
export const SIZE_UPDATE_COOLDOWN_MS = 20_000;

/** Debounce delay for server-side search (InventoryPage). */
export const INVENTORY_SEARCH_DEBOUNCE_MS = 300;
