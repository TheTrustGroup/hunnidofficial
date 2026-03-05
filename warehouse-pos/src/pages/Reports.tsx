import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, Table, AlertTriangle, RefreshCw } from 'lucide-react';
import { useInventory } from '../contexts/InventoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse } from '../contexts/WarehouseContext';
import { DateRangePicker } from '../components/reports/DateRangePicker';
import { SalesMetrics } from '../components/reports/SalesMetrics';
import { SalesChart } from '../components/reports/SalesChart';
import { TopProductsTable } from '../components/reports/TopProductsTable';
import { InventoryMetrics } from '../components/reports/InventoryMetrics';
import { generateSalesReport, generateInventoryReport, exportToCSV, getProductQty, getProductValuePrice, SalesReport, InventoryReport } from '../services/reportService';
import { fetchSalesAsTransactions, fetchSalesReportFromApi, type SalesReportFromApi } from '../services/salesApi';
import { fetchTransactionsFromApi } from '../services/transactionsApi';
import { Transaction } from '../types';
import { formatCurrency, getCategoryDisplay, formatDate } from '../lib/utils';
import { getStoredData } from '../lib/storage';
import { parseDate, validateDateRange } from '../lib/dateUtils';
import { API_BASE_URL } from '../lib/api';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { PERMISSIONS } from '../types/permissions';

type ReportType = 'sales' | 'inventory';
type TransactionsSource = 'server' | 'local';

export function Reports() {
  const { products } = useInventory();
  const { user, hasPermission } = useAuth();
  const { currentWarehouseId, currentWarehouse, isWarehouseBoundToSession } = useWarehouse();
  const canViewInventoryReport = hasPermission(PERMISSIONS.REPORTS.VIEW_INVENTORY);
  const [reportType, setReportType] = useState<ReportType>('sales');

  const today = new Date().toISOString().split('T')[0];
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(last30Days);
  const [endDate, setEndDate] = useState(today);

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  /** When set, sales metrics come from GET /api/reports/sales (SQL, correct COGS/profit). Otherwise from JS generateSalesReport. */
  const [salesReportFromApi, setSalesReportFromApi] = useState<SalesReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsSource, setTransactionsSource] = useState<TransactionsSource>('local');
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const canFetchServerData = !!user;

  /** When report API was used, use it (correct COGS/profit); else use JS-generated report. */
  const effectiveSalesReport = salesReportFromApi ?? salesReport;

  function mapReportApiToSalesReport(data: SalesReportFromApi): SalesReport {
    return {
      totalRevenue: data.revenue,
      totalProfit: data.profit,
      totalTransactions: data.transactionCount,
      totalVoided: data.totalVoided,
      totalItemsSold: data.totalItemsSold,
      averageOrderValue: data.averageOrderValue,
      topSellingProducts: (data.topProducts ?? []).map(p => ({
        productName: p.product_name ?? '',
        quantitySold: p.quantity_sold ?? 0,
        revenue: p.revenue ?? 0,
      })),
      salesByCategory: (data.salesByCategory ?? []).map(c => ({
        category: c.category ?? '',
        revenue: c.revenue ?? 0,
        quantity: c.quantity ?? 0,
      })),
      salesByDay: (data.salesByDay ?? []).map(d => ({
        date: d.date ?? '',
        revenue: d.revenue ?? 0,
        transactions: d.transactions ?? 0,
      })),
    };
  }

  /** Load sales: prefer GET /api/reports/sales (SQL, correct profit). Fallback: GET /api/sales then generate report in JS. */
  const loadSalesData = useCallback(async () => {
    const start = parseDate(startDate);
    const end = parseDate(endDate + 'T23:59:59');
    if (!start || !end) return;
    const validation = validateDateRange(start, end);
    if (!validation.valid) return;

    const fromIso = start.toISOString();
    const toIso = end.toISOString();

    const fallbackLocal = () => {
      const stored = getStoredData<Transaction[]>('transactions', []);
      const withDates = (Array.isArray(stored) ? stored : []).map((t: Transaction & { createdAt?: unknown; completedAt?: unknown }) => ({
        ...t,
        createdAt: t.createdAt instanceof Date ? t.createdAt : (parseDate(t.createdAt != null ? String(t.createdAt) : '') ?? new Date()),
        completedAt: t.completedAt instanceof Date ? t.completedAt : (t.completedAt != null ? parseDate(String(t.completedAt)) : null),
      }));
      setTransactions(withDates);
      setTransactionsSource('local');
      setSalesReportFromApi(null);
    };

    if (canFetchServerData) {
      setTransactionsLoading(true);
      setTransactionsError(null);
      try {
        const { data } = await fetchSalesReportFromApi(API_BASE_URL, {
          from: fromIso,
          to: toIso,
          warehouse_id: currentWarehouseId || undefined,
          include_voided: true,
        });
        setSalesReportFromApi(mapReportApiToSalesReport(data));
        setTransactions([]);
        setTransactionsSource('server');
      } catch {
        setSalesReportFromApi(null);
        try {
          const { data } = await fetchSalesAsTransactions(API_BASE_URL, {
            from: fromIso,
            to: toIso,
            warehouse_id: currentWarehouseId || undefined,
            limit: 2000,
            include_voided: true,
          });
          setTransactions(data);
          setTransactionsSource('server');
        } catch {
          try {
            const { data } = await fetchTransactionsFromApi(API_BASE_URL, {
              from: fromIso,
              to: toIso,
              warehouse_id: currentWarehouseId || undefined,
              limit: 2000,
            });
            setTransactions(data);
            setTransactionsSource('server');
          } catch {
            setTransactionsError('Failed to load sales from server. Showing local data if available.');
            fallbackLocal();
          }
        }
      } finally {
        setTransactionsLoading(false);
      }
    } else {
      setTransactionsError(null);
      setSalesReportFromApi(null);
      fallbackLocal();
    }
  }, [startDate, endDate, canFetchServerData, currentWarehouseId]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  useEffect(() => {
    if (reportType === 'sales') {
      const start = parseDate(startDate);
      const end = parseDate(endDate + 'T23:59:59');
      if (!start || !end) {
        setSalesReport(null);
        return;
      }
      const validation = validateDateRange(start, end);
      if (!validation.valid) {
        setSalesReport(null);
        return;
      }
      const report = generateSalesReport(transactions, products, start, end);
      setSalesReport(report);
    } else {
      const report = generateInventoryReport(products);
      setInventoryReport(report);
    }
  }, [reportType, startDate, endDate, transactions, products]);

  const handleExportSales = () => {
    const start = parseDate(startDate);
    const end = parseDate(endDate + 'T23:59:59');
    if (!start || !end) return;
    const inRange = transactions.filter(t => {
      const d = new Date(t.createdAt);
      return d >= start && d <= end;
    });
    const exportData = inRange.map(t => ({
      Date: formatDate(t.createdAt),
      'Receipt ID': t.transactionNumber,
      Total: t.total,
      Voided: t.voidedAt ? 'Yes' : 'No',
      'Voided By': t.voidedBy ?? '',
      Cashier: t.cashier ?? '',
      'Payment Method': t.paymentMethod ?? '',
      'Item Count': t.items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
    }));
    exportToCSV(exportData.length ? exportData : [{ Date: '', 'Receipt ID': '', Total: '', Voided: '', 'Voided By': '', Cashier: '', 'Payment Method': '', 'Item Count': '' }], 'sales_transactions');
  };

  const handleExportInventory = () => {
    const exportData = products.map(p => {
      const qty = getProductQty(p);
      const unitPrice = getProductValuePrice(p);
      return {
        'SKU': p.sku,
        'Name': p.name,
        'Category': getCategoryDisplay(p.category),
        'Quantity': qty,
        'Cost Price': p.costPrice,
        'Selling Price': p.sellingPrice,
        'Total Value': qty * unitPrice,
      };
    });
    exportToCSV(exportData, 'inventory_report');
  };

  const locationLabel = isWarehouseBoundToSession && currentWarehouse?.name
    ? `Reporting for: ${currentWarehouse.name}`
    : currentWarehouse?.name
      ? `Warehouse: ${currentWarehouse.name}`
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <PageHeader title="Reports & Analytics" description="Comprehensive business insights" />
          {locationLabel && (
            <p className="text-sm font-medium text-slate-600 mt-1" aria-live="polite">
              {locationLabel}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={reportType === 'sales' ? handleExportSales : handleExportInventory}
          className="flex items-center gap-2"
        >
          <Download className="w-5 h-5" strokeWidth={2} />
          Export CSV
        </Button>
      </div>

      {/* Report Type Selector: Sales always; Inventory only when user has VIEW_INVENTORY (e.g. manager/admin) */}
      <div className="flex gap-3 animate-fade-in-up">
        <Button
          type="button"
          variant={reportType === 'sales' ? 'primary' : 'secondary'}
          onClick={() => setReportType('sales')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
        >
          <FileText className="w-5 h-5" strokeWidth={2} />
          Sales Report
        </Button>
        {canViewInventoryReport && (
          <Button
            type="button"
            variant={reportType === 'inventory' ? 'primary' : 'secondary'}
            onClick={() => setReportType('inventory')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
          >
            <Table className="w-5 h-5" strokeWidth={2} />
            Inventory Report
          </Button>
        )}
      </div>

      {/* Sales Report */}
      {reportType === 'sales' && (
        <div className="space-y-6">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          {transactionsError && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3" role="alert">
              <p className="text-amber-900 text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" aria-hidden />
                {transactionsError}
              </p>
              <Button variant="primary" size="sm" onClick={() => loadSalesData()} className="inline-flex items-center gap-2 shrink-0" aria-label="Retry loading sales">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          )}
          {transactionsLoading && (
            <p className="text-sm text-slate-500">Loading sales from server…</p>
          )}
          {!transactionsLoading && reportType === 'sales' && (
            <p className="text-sm text-slate-500">
              {transactionsSource === 'server'
                ? (currentWarehouseId
                    ? `Showing POS sales for ${currentWarehouse?.name ?? 'this location'} for the selected date range.`
                    : 'Showing POS sales from server for the selected date range and warehouse.')
                : 'Showing sales from this device (offline/local).'}
            </p>
          )}

          {effectiveSalesReport && (
            <>
              <SalesMetrics report={effectiveSalesReport} />
              <SalesChart report={effectiveSalesReport} />
              <TopProductsTable report={effectiveSalesReport} />
              {/* Category Performance */}
              <div className="table-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 px-6 pt-6">Category Performance</h3>
            <div className="table-scroll-wrap">
              <table className="w-full min-w-[320px]">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Quantity Sold</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveSalesReport.salesByCategory.map((cat, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="px-4 py-3 font-medium text-slate-900">{cat.category}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{cat.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(cat.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {effectiveSalesReport.totalRevenue > 0 ? ((cat.revenue / effectiveSalesReport.totalRevenue) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* Inventory Report */}
      {reportType === 'inventory' && inventoryReport && (
        <div className="space-y-6">
          <InventoryMetrics report={inventoryReport} />

          {/* Top Value Products */}
          <div className="table-container">
            <h3 className="text-lg font-semibold text-slate-900 mb-6 px-6 pt-6">Highest Value Inventory</h3>
            <div className="table-scroll-wrap">
              <table className="w-full min-w-[280px]">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.topValueProducts.map((product, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{product.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(product.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="table-container">
            <h3 className="text-lg font-semibold text-slate-900 mb-6 px-6 pt-6">Inventory by Category</h3>
            <div className="table-scroll-wrap">
              <table className="w-full min-w-[320px]">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Product Count</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.productsByCategory.map((cat, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="px-4 py-3 font-medium text-slate-900">{cat.category}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{cat.count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(cat.value)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {inventoryReport.totalStockValue > 0 ? ((cat.value / inventoryReport.totalStockValue) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
