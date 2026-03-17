/** Premium bouncing / wave-dots loading indicator. Use across the app for loading states. */
export function LoadingSpinner({ size = 'md', inverse = false }: { size?: 'sm' | 'md' | 'lg'; inverse?: boolean }) {
  const sizeClass = size === 'sm' ? 'loading-wave-dots-sm' : size === 'lg' ? 'loading-wave-dots-lg' : '';
  const inverseClass = inverse ? 'loading-wave-dots-inverse' : '';
  return (
    <div className={`loading-wave-dots ${sizeClass} ${inverseClass}`} aria-hidden role="img" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 solid-overlay flex items-center justify-center z-50">
      <div className="solid-card rounded-2xl p-8 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium">Loading…</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="solid-card rounded-2xl p-6 overflow-hidden relative min-h-[8.5rem]">
      <div className="absolute inset-0 skeleton-shimmer pointer-events-none" aria-hidden />
      <div className="h-4 bg-slate-200/80 dark:bg-slate-600/50 rounded w-1/4 mb-4 animate-pulse" />
      <div className="h-8 bg-slate-200/80 dark:bg-slate-600/50 rounded w-1/2 mb-2 animate-pulse" />
      <div className="h-3 bg-slate-200/80 dark:bg-slate-600/50 rounded w-3/4 animate-pulse" />
    </div>
  );
}
