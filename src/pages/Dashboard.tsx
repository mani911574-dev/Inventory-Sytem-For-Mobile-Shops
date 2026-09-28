import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Wallet,
  Clock,
  ShoppingCart,
  Users,
  Building2,
  ArrowUpRight,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { StatsCard } from '../components/common/StatsCard';
import { Badge } from '../components/common/Badge';
import { Product, Sale, Vendor, Customer, ShopSettings } from '../types';
import { productService } from '../services/productService';
import { salesService } from '../services/salesService';
import { vendorService } from '../services/vendorService';
import { customerService } from '../services/customerService';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DashboardProps {
  onNavigate: (tab: any) => void;
  settings?: ShopSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, settings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);

  const currency = settings?.currency_symbol || 'Rs.';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [prodData, saleData, vendorData, custData] = await Promise.all([
        productService.getProducts(),
        salesService.getSales(),
        vendorService.getVendors(),
        customerService.getCustomers()
      ]);
      setProducts(prodData);
      setSales(saleData);
      setVendors(vendorData);
      setCustomers(custData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Today's metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.sale_date && s.sale_date.startsWith(todayStr));
  const todayTotalRevenue = todaySales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const todayTotalProfit = todaySales.reduce((acc, s) => acc + Number(s.profit), 0);

  // Inventory value & low stock
  const lowStockProducts = products.filter((p) => p.quantity <= p.min_stock_level);
  const totalStockValue = products.reduce(
    (acc, p) => acc + Number(p.quantity) * Number(p.purchase_price),
    0
  );

  // Vendor payables total & Customer Udhar total
  const totalVendorPayables = vendors.reduce((acc, v) => acc + Number(v.current_balance), 0);
  const totalCustomerUdhar = customers.reduce((acc, c) => acc + Number(c.current_udhar), 0);

  // Vendors with outstanding payables
  const outstandingVendors = vendors
    .filter((v) => Number(v.current_balance) > 0)
    .sort((a, b) => Number(b.current_balance) - Number(a.current_balance));

  // Customers with active Udhar
  const outstandingCustomers = customers
    .filter((c) => Number(c.current_udhar) > 0)
    .sort((a, b) => Number(b.current_udhar) - Number(a.current_udhar));

  // Recent 5 sales
  const recentSales = sales.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 8 Business Status KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Sales Revenue"
          value={formatCurrency(todayTotalRevenue, currency)}
          subtitle={`${todaySales.length} invoice(s) today`}
          icon={DollarSign}
          iconColor="text-indigo-600 bg-indigo-50"
        />
        <StatsCard
          title="Today's Net Profit"
          value={formatCurrency(todayTotalProfit, currency)}
          subtitle="Exact purchase cost deducted"
          icon={TrendingUp}
          iconColor="text-emerald-600 bg-emerald-50"
        />
        <StatsCard
          title="Total Stock Value"
          value={formatCurrency(totalStockValue, currency)}
          subtitle={`${products.length} products listed`}
          icon={Package}
          iconColor="text-sky-600 bg-sky-50"
          onClick={() => onNavigate('products')}
        />
        <StatsCard
          title="Low Stock Items"
          value={lowStockProducts.length}
          subtitle="Units below reorder level"
          icon={AlertTriangle}
          iconColor="text-rose-600 bg-rose-50"
          onClick={() => onNavigate('products')}
        />

        <StatsCard
          title="Vendor Payables"
          value={formatCurrency(totalVendorPayables, currency)}
          subtitle={`${outstandingVendors.length} supplier(s) owed`}
          icon={Building2}
          iconColor="text-amber-600 bg-amber-50"
          onClick={() => onNavigate('vendor-payments')}
        />
        <StatsCard
          title="Customer Udhar (Credit)"
          value={formatCurrency(totalCustomerUdhar, currency)}
          subtitle={`${outstandingCustomers.length} active borrower(s)`}
          icon={Clock}
          iconColor="text-purple-600 bg-purple-50"
          onClick={() => onNavigate('udhar')}
        />
        <StatsCard
          title="Total Invoices Created"
          value={sales.length}
          subtitle="All historical receipts"
          icon={ShoppingCart}
          iconColor="text-teal-600 bg-teal-50"
          onClick={() => onNavigate('reports')}
        />
        <StatsCard
          title="Registered Clients"
          value={customers.filter((c) => !c.is_walk_in).length}
          subtitle="Customer profiles tracked"
          icon={Users}
          iconColor="text-blue-600 bg-blue-50"
          onClick={() => onNavigate('customers')}
        />
      </div>

      {/* Middle Section: Sales & Profit Overview + Low Stock Quick List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Highlights */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sales & Profit Overview</h3>
                <p className="text-xs text-slate-500">Summary performance of phone & accessory sales</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setChartView('daily')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartView === 'daily' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setChartView('weekly')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartView === 'weekly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartView === 'monthly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Visual metric bars */}
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Gross Sales Revenue</span>
                  <span className="text-indigo-600 font-mono">
                    {formatCurrency(
                      sales.reduce((acc, s) => acc + Number(s.total_amount), 0),
                      currency
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Net Gross Profit</span>
                  <span className="text-emerald-600 font-mono">
                    {formatCurrency(
                      sales.reduce((acc, s) => acc + Number(s.profit), 0),
                      currency
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-4/5" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Cost of Goods Sold (COGS)</span>
                  <span className="text-amber-600 font-mono">
                    {formatCurrency(
                      sales.reduce((acc, s) => acc + Number(s.total_cost), 0),
                      currency
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full w-3/5" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need detailed ledger analysis?</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
            >
              <span>View Full Sales Reports</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900">Low Stock Warning</h3>
              </div>
              <span className="text-xs bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                {lowStockProducts.length} items
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto">
              {lowStockProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  All inventory items are currently above their minimum threshold.
                </div>
              ) : (
                lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-800 line-clamp-1">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Threshold: {p.min_stock_level} units
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        {p.quantity} in stock
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('purchases')}
            className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Create Stock-In Purchase
          </button>
        </div>
      </div>

      {/* Dual Panel: Vendor Payables & Customer Udhar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Payables Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Vendor Payables (Owed)</h3>
            </div>
            <button
              onClick={() => onNavigate('vendor-payments')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              View All Payables
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {outstandingVendors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No outstanding vendor payments due! All cleared.
              </div>
            ) : (
              outstandingVendors.slice(0, 4).map((v) => (
                <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{v.name}</h4>
                    <p className="text-[11px] text-slate-500">{v.company_name || 'Wholesaler'}</p>
                    <span className="text-[10px] text-slate-400">Terms: {v.payment_terms}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-amber-700 block">
                      {formatCurrency(v.current_balance, currency)}
                    </span>
                    <button
                      onClick={() => onNavigate('vendor-payments')}
                      className="mt-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Pay Vendor →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Udhar (Receivables) Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Customer Udhar (Due Soon)</h3>
            </div>
            <button
              onClick={() => onNavigate('udhar')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              View Udhar Ledger
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {outstandingCustomers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No unpaid customer credit records.
              </div>
            ) : (
              outstandingCustomers.slice(0, 4).map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] text-slate-500">{c.phone || 'No phone recorded'}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="font-mono font-bold text-sm text-purple-700 block">
                        {formatCurrency(c.current_udhar, currency)}
                      </span>
                      <button
                        onClick={() => onNavigate('udhar')}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Collect Udhar
                      </button>
                    </div>
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Assalam-o-Alaikum ${c.name}, this is a gentle payment reminder from ${settings?.shop_name || 'TechMobile'}. Your outstanding balance is ${formatCurrency(c.current_udhar, currency)}. Thank you.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Sales Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Invoices</h3>
            <p className="text-xs text-slate-500">Latest completed shop transactions</p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            All Sales Reports →
          </button>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Total Bill</th>
                <th className="py-2.5 px-3 text-right">Profit</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {s.invoice_number}
                  </td>
                  <td className="py-3 px-3 text-slate-500">{formatDate(s.sale_date)}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{s.customer_name}</td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-600">{s.payment_method}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(s.total_amount, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    +{formatCurrency(s.profit, currency)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant={
                        s.payment_status === 'Paid'
                          ? 'success'
                          : s.payment_status === 'Partially Paid'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {s.payment_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
