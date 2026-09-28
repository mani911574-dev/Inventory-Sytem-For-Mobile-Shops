import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Package,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { StatsCard } from '../components/common/StatsCard';
import { Badge } from '../components/common/Badge';
import { ReturnFormModal } from '../components/returns/ReturnFormModal';
import { Sale, ShopSettings } from '../types';
import { salesService } from '../services/salesService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExporter';

interface ReportsProps {
  settings?: ShopSettings;
}

type DatePreset = 'today' | 'yesterday' | 'week' | 'this_month' | 'last_month' | 'all' | 'custom';

export const Reports: React.FC<ReportsProps> = ({ settings }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Return modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const currency = settings?.currency_symbol || 'Rs.';

  const computeDateRange = (selectedPreset: DatePreset) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    if (selectedPreset === 'today') {
      const todayStr = `${yyyy}-${mm}-${dd}`;
      return { start: todayStr, end: todayStr };
    } else if (selectedPreset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    } else if (selectedPreset === 'week') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { start: w.toISOString().split('T')[0], end: `${yyyy}-${mm}-${dd}` };
    } else if (selectedPreset === 'this_month') {
      const firstDay = `${yyyy}-${mm}-01`;
      return { start: firstDay, end: `${yyyy}-${mm}-${dd}` };
    } else if (selectedPreset === 'last_month') {
      const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: firstDayPrev.toISOString().split('T')[0],
        end: lastDayPrev.toISOString().split('T')[0]
      };
    }
    return { start: '', end: '' };
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const { start, end } = computeDateRange(preset);
      const data = await salesService.getSales({
        startDate: preset === 'custom' ? startDate : start,
        endDate: preset === 'custom' ? endDate : end
      });
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== 'custom') {
      const { start, end } = computeDateRange(preset);
      setStartDate(start);
      setEndDate(end);
    }
    loadReports();
  }, [preset]);

  const handleExportCSV = () => {
    const exportData = filteredSales.map((s) => ({
      'Invoice #': s.invoice_number,
      Date: formatDate(s.sale_date),
      Customer: s.customer_name,
      'Customer Phone': s.customer_phone || '',
      'Payment Method': s.payment_method,
      'Total Revenue': s.total_amount,
      'COGS (Cost)': s.total_cost,
      'Gross Profit': s.profit,
      'Amount Paid': s.paid_amount,
      'Remaining Udhar': s.remaining_amount,
      Status: s.payment_status
    }));

    exportToCSV(exportData, 'Sales_Report');
  };

  // KPIs
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalCOGS = sales.reduce((acc, s) => acc + Number(s.total_cost), 0);
  const totalGrossProfit = sales.reduce((acc, s) => acc + Number(s.profit), 0);
  const totalDiscount = sales.reduce((acc, s) => acc + Number(s.discount_amount), 0);
  const totalPaid = sales.reduce((acc, s) => acc + Number(s.paid_amount), 0);
  const totalUdharGenerated = sales.reduce((acc, s) => acc + Number(s.remaining_amount), 0);
  const totalItemsSold = sales.reduce(
    (acc, s) => acc + (s.items?.reduce((iAcc, item) => iAcc + item.quantity, 0) || 1),
    0
  );

  const profitMargin = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : '0';

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.invoice_number.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      (s.customer_phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Sales & Profit Reports</h2>
          <p className="text-xs text-slate-500">
            Real-time accounting ledger, true historical profit calculations, and audit exports
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsReturnModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Process Return</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Date Presets Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Date Range:</span>
          </span>

          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id as DatePreset)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                preset === item.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Range pickers */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-slate-500 mb-0.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-0.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <button
              onClick={loadReports}
              className="mt-4 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Gross Revenue"
          value={formatCurrency(totalRevenue, currency)}
          subtitle={`${sales.length} invoices generated`}
          icon={DollarSign}
          iconColor="text-indigo-600 bg-indigo-50"
        />
        <StatsCard
          title="Gross Profit"
          value={formatCurrency(totalGrossProfit, currency)}
          subtitle={`${profitMargin}% margin on sales`}
          icon={TrendingUp}
          iconColor="text-emerald-600 bg-emerald-50"
        />
        <StatsCard
          title="Cost of Goods (COGS)"
          value={formatCurrency(totalCOGS, currency)}
          subtitle="Inventory cost basis"
          icon={Package}
          iconColor="text-amber-600 bg-amber-50"
        />
        <StatsCard
          title="Total Items Sold"
          value={totalItemsSold}
          subtitle={`Udhar generated: ${formatCurrency(totalUdharGenerated, currency)}`}
          icon={FileText}
          iconColor="text-sky-600 bg-sky-50"
        />
      </div>

      {/* Sales Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredSales.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Items & IMEIs</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                <th className="py-3 px-3 text-right">Cost</th>
                <th className="py-3 px-3 text-right">Gross Profit</th>
                <th className="py-3 px-3 text-right">Udhar (Due)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    Loading sales reports...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    No transactions found in this period.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.invoice_number}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-sans">
                      {formatDate(s.sale_date)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800 font-sans">
                      {s.customer_name}
                    </td>
                    <td className="py-3.5 px-3 font-sans">
                      <div className="max-w-xs space-y-0.5">
                        {(s.items || []).map((item, idx) => (
                          <div key={idx} className="text-[11px] truncate">
                            <span className="font-medium text-slate-800">{item.product_name}</span>
                            {item.imei_1 && (
                              <span className="text-[10px] text-indigo-700 ml-1 font-mono">
                                (IMEI: {item.imei_1})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-sans">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(s.total_amount, currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      {formatCurrency(s.total_cost, currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                      +{formatCurrency(s.profit, currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-purple-700">
                      {Number(s.remaining_amount) > 0
                        ? formatCurrency(s.remaining_amount, currency)
                        : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-sans">
                      <Badge
                        variant={
                          s.status === 'returned'
                            ? 'neutral'
                            : s.payment_status === 'Paid'
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {s.status === 'returned' ? 'Returned' : s.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RETURN MODAL */}
      <ReturnFormModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onReturnSuccess={() => {
          setFeedbackMsg('Sale item return processed and IMEI inventory restored to available.');
          loadReports();
        }}
        currency={currency}
      />
    </div>
  );
};
