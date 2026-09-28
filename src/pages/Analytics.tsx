import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Award,
  AlertTriangle,
  Building2,
  Users,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { StatsCard } from '../components/common/StatsCard';
import { Product, Sale, Vendor, Customer, Category, ShopSettings } from '../types';
import { productService } from '../services/productService';
import { salesService } from '../services/salesService';
import { vendorService } from '../services/vendorService';
import { customerService } from '../services/customerService';
import { categoryService } from '../services/categoryService';
import { formatCurrency } from '../utils/formatters';

interface AnalyticsProps {
  settings?: ShopSettings;
}

export const Analytics: React.FC<AnalyticsProps> = ({ settings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const currency = settings?.currency_symbol || 'Rs.';

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [prodData, saleData, venData, custData, catData] = await Promise.all([
        productService.getProducts(),
        salesService.getSales(),
        vendorService.getVendors(),
        customerService.getCustomers(),
        categoryService.getCategories()
      ]);
      setProducts(prodData);
      setSales(saleData);
      setVendors(venData);
      setCustomers(custData);
      setCategories(catData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Best-selling products calculation
  const productSalesMap: Record<string, { name: string; brand: string; count: number; revenue: number }> = {};
  sales.forEach((s) => {
    (s.items || []).forEach((item) => {
      if (!productSalesMap[item.product_id]) {
        productSalesMap[item.product_id] = {
          name: item.product_name,
          brand: item.product?.brand || '',
          count: 0,
          revenue: 0
        };
      }
      productSalesMap[item.product_id].count += item.quantity;
      productSalesMap[item.product_id].revenue += Number(item.line_total);
    });
  });

  const bestSellers = Object.values(productSalesMap).sort((a, b) => b.count - a.count).slice(0, 5);

  // Slow-moving products (products with 0 sales)
  const soldProductIds = new Set(Object.keys(productSalesMap));
  const slowMoving = products.filter((p) => !soldProductIds.has(p.id)).slice(0, 5);

  // Top Customers by Purchase Value
  const topCustomers = [...customers]
    .filter((c) => !c.is_walk_in)
    .sort((a, b) => Number(b.total_purchases) - Number(a.total_purchases))
    .slice(0, 5);

  // Top Vendors by Balance & Volume
  const vendorRankings = [...vendors].sort(
    (a, b) => Number(b.current_balance) - Number(a.current_balance)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Shop Analytics & Business Intelligence</h2>
        <p className="text-xs text-slate-500">
          Clean visual breakdown of mobile sales velocity, top margins, supplier debts, and client rankings
        </p>
      </div>

      {/* Top Row: Product Movement Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best-Selling Phone Models & Accessories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Best-Selling Products</h3>
                <p className="text-[11px] text-slate-500">Highest volume turnover models</p>
              </div>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">
              Top Ranked
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {bestSellers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No product sales recorded yet.
              </div>
            ) : (
              bestSellers.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[11px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{item.brand}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-600 block">{item.count} units sold</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatCurrency(item.revenue, currency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Slow-Moving / Dead Inventory Warnings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Slow-Moving Inventory</h3>
                <p className="text-[11px] text-slate-500">In-stock items with zero sales</p>
              </div>
            </div>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full">
              Needs Promotion
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {slowMoving.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All inventory items have active sales velocity!
              </div>
            ) : (
              slowMoving.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{item.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      Cost: {formatCurrency(item.purchase_price, currency)} • Stock: {item.quantity} units
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-700">
                      {formatCurrency(item.sale_price, currency)}
                    </span>
                    <span className="text-[10px] text-rose-600 block font-semibold">0 Sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Top Customers & Vendor Payables Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Top Customers by Purchase Volume</h3>
                <p className="text-[11px] text-slate-500">Highest gross spenders</p>
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {topCustomers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No customer transactions recorded yet.
              </div>
            ) : (
              topCustomers.map((c, i) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-[11px]">
                      #{i + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900">{c.name}</h4>
                      <p className="text-[11px] text-slate-400">{c.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-900 block">
                      {formatCurrency(c.total_purchases, currency)}
                    </span>
                    {Number(c.current_udhar) > 0 ? (
                      <span className="text-[10px] font-bold text-purple-700">
                        Udhar: {formatCurrency(c.current_udhar, currency)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-semibold">Fully Paid</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vendors Payables & Volume Ranking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Wholesale Vendor Distribution</h3>
                <p className="text-[11px] text-slate-500">Outstanding liabilities per distributor</p>
              </div>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {vendorRankings.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{v.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {v.company_name || 'Wholesale'} • Terms: {v.payment_terms}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Outstanding
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      v.current_balance > 0 ? 'text-amber-700' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(v.current_balance, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
