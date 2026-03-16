/**
 * Dashboard route component. Implementation lives in DashboardPage.tsx so that
 * stats are always fetched for the warehouse selected in WarehouseContext (fixes
 * Re-export keeps existing routes working.
 */
import DashboardPage from './DashboardPage';

export function Dashboard() {
  return <DashboardPage />;
}
