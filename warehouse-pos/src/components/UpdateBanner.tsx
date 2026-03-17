/**
 * Shows a banner when the deployed app version is newer than the client's.
 * Clients can tap "Refresh" to load the new version.
 */

import { useState, useEffect } from 'react';

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const clientBuildId = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_ID;
    if (!clientBuildId) return;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { buildId?: string };
        if (data.buildId && data.buildId !== clientBuildId) setShow(true);
      } catch (_) {}
    };

    check();
    const id = setInterval(check, VERSION_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-2.5 shadow-md"
      style={{
        background: 'var(--blue)',
        color: 'white',
        fontFamily: "var(--edk-font-ui)",
        fontSize: '13px',
      }}
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">New version available. Refresh to update.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 px-3 py-1.5 rounded-lg font-semibold bg-white/20 hover:bg-white/30 transition-colors touch-manipulation"
      >
        Refresh
      </button>
    </div>
  );
}
