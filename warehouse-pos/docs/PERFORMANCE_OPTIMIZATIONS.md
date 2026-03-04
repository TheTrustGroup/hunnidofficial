# Performance optimizations (all devices)

Applied so the app runs faster on desktop and mobile.

## 1. Build (Vite)

- **Manual chunks** (`vite.config.ts`): `react`, `router`, `recharts`, `framer`, `lucide`, `idb`. Repeat visits reuse cached vendor chunks; app chunk updates per deploy.
- **Minify**: Terser with single-pass compress. Smaller JS/CSS for faster parse on low-end devices.
- **Target**: `es2020` for modern runtimes; no legacy polyfill bloat unless you add `@vitejs/plugin-legacy`.
- **CSS**: `cssCodeSplit: true` so each route loads only its styles.

## 2. Context

- **InventoryContext**: Provider `value` is wrapped in `useMemo` with correct deps. Reduces re-renders of all `useInventory()` consumers when unrelated state (e.g. toast) changes.

## 3. Components

- **ProductCard** (Inventory): Wrapped in `React.memo`. List items only re-render when their `product` or callback refs change.
- **ProductGrid** (POS): Wrapped in `React.memo`. Grid and filters skip re-renders when parent state (e.g. cart count) changes but grid props are unchanged.
- **POSProductCard**: Already memoized.

## 4. Font (index.html)

- Inter is loaded with `media="print"` then `onload="this.media='all'"` so it does not block first paint. `display=swap` in the URL avoids invisible text; noscript fallback for no-JS.

## 5. Service worker

- **Cache version**: Bumped on each production deploy (`public/service-worker.js` `CACHE_VERSION`). Ensures mobile and desktop get new JS/CSS; old caches evicted on activate.
- **Document**: Never cached (NetworkOnly). Shell always fresh.
- **Static assets**: CacheFirst for scripts, styles, images, fonts. Fast repeat loads.

## 6. Navigation parity

- **Single nav config** (`src/config/navigation.tsx`): Sidebar and MobileMenu both use `BASE_NAVIGATION`. New routes (e.g. Deliveries) added once and appear on desktop and mobile.

## Checklist when adding features

- [ ] New nav item → add only in `src/config/navigation.tsx`.
- [ ] New route → lazy-load with `lazyWithRetry` in `App.tsx`.
- [ ] Large list (100+ items) → consider virtualization (e.g. `react-window`) or pagination (Inventory already uses “Load more”).
- [ ] New context value → memoize the provider value if it’s an object/array.
- [ ] Deploy → bump `CACHE_VERSION` in `public/service-worker.js`.
