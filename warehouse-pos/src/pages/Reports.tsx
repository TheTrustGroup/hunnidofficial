import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { useInventory } from '../contexts/InventoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse } from '../contexts/WarehouseContext';
import { DateRangePicker } from '../components/reports/DateRangePicker';
import { SalesMetrics } from '../components/reports/SalesMetrics';
import { SalesChart } from '../components/reports/SalesChart';
import { TopProductsTable } from '../components/reports/TopProductsTable';
import { InventoryMetrics } from '../components/reports/InventoryMetrics';
import { generateSalesReport, generateInventoryReport, exportToCSV, getProductQty, getProductValuePrice, SalesReport, InventoryReport } from '../services/reportService';
import { fetchSalesAsTransactions } from '../services/salesApi';
import { fetchTransactionsFromApi } from '../services/transactionsApi';
import { Transaction } from '../types';
import { formatCurrency, getCategoryDisplay } from '../lib/utils';
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
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsSource, setTransactionsSource] = useState<TransactionsSource>('local');
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const canFetchServerData = !!user;

  /** Load sales: prefer GET /api/sales (POS data). When at a POS location (bound), currentWarehouseId is set so results are accurate per location. */
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
    };

    if (canFetchServerData) {
      setTransactionsLoading(true);
      try {
        const { data } = await fetchSalesAsTransactions(API_BASE_URL, {
          from: fromIso,
          to: toIso,
          warehouse_id: currentWarehouseId || undefined,
          limit: 2000,
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
          fallbackLocal();
        }
      } finally {
        setTransactionsLoading(false);
      }
    } else {
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
    if (!salesReport) return;
    
    const exportData = salesReport.topSellingProducts.map(p => ({
      'Product Name': p.productName,
      'Quantity Sold': p.quantitySold,
      'Revenue': p.revenue,
    }));
    
    exportToCSV(exportData, 'sales_report');
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

          {salesReport && (
            <>
              <SalesMetrics report={salesReport} />
              <SalesChart report={salesReport} />
              <TopProductsTable report={salesReport} />
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
                  {salesReport.salesByCategory.map((cat, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="px-4 py-3 font-medium text-slate-900">{cat.category}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{cat.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(cat.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {salesReport.totalRevenue > 0 ? ((cat.revenue / salesReport.totalRevenue) * 100).toFixed(1) : '0.0'}%
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
