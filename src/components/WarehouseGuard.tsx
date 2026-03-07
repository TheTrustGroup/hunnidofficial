/**
 * Phase 2 Rebirth: Guard for authenticated routes — ensures current warehouse is loaded (real UUID).
 * Styled in Hunnid blue (#5CACFA), Syne font. No red, no Barlow Condensed.
 */
import { useCurrentWarehouse } from '../hooks/useCurrentWarehouse';

export function WarehouseGuard({ children }: { children: React.ReactNode }) {
  const { id, isLoading, error } = useCurrentWarehouse();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0A0A0A',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <style>{`@keyframes warehouse-guard-spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #2A2A2A',
            borderTopColor: '#5CACFA',
            borderRadius: '50%',
            animation: 'warehouse-guard-spin 0.8s linear infinite',
          }}
        />
        <p
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#52525B',
          }}
        >
          Loading warehouse...
        </p>
      </div>
    );
  }

  if (!id || error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0A0A0A',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <p
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: '#FFFFFF',
          }}
        >
          Could not load warehouse
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: '#52525B',
          }}
        >
          Contact your administrator.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: '10px 20px',
            background: '#5CACFA',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
