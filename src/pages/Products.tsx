import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Smartphone,
  Eye,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Package,
  AlertTriangle,
  History,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Product, Category, Vendor, InventoryItem, ShopSettings } from '../types';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { vendorService } from '../services/vendorService';
import { ProductFormModal } from '../components/inventory/ProductFormModal';
import { ImeiListDrawer } from '../components/inventory/ImeiListDrawer';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { formatCurrency } from '../utils/formatters';

interface ProductsProps {
  settings?: ShopSettings;
}

export const Products: React.FC<ProductsProps> = ({ settings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');
  const [imeiSearchQuery, setImeiSearchQuery] = useState('');
  const [imeiSearchResults, setImeiSearchResults] = useState<InventoryItem[] | null>(null);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImeiDrawerOpen, setIsImeiDrawerOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const currency = settings?.currency_symbol || 'Rs.';

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, vendorData] = await Promise.all([
        productService.getProducts(),
        categoryService.getCategories(),
        vendorService.getVendors()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setVendors(vendorData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Dedicated IMEI lookup
  const handleImeiSearch = async () => {
    if (!imeiSearchQuery.trim()) {
      setImeiSearchResults(null);
      return;
    }
    try {
      const results = await productService.searchByImei(imeiSearchQuery.trim());
      setImeiSearchResults(results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (selectedProduct) {
      await productService.updateProduct(selectedProduct.id, productData);
      showFeedback('Product updated successfully!');
    } else {
      await productService.createProduct(productData);
      showFeedback('Product created successfully!');
    }
    loadData();
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to archive "${name}"?`)) {
      try {
        await productService.deleteProduct(id);
        showFeedback(`"${name}" archived.`);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Unique brands list for filter
  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      (p.product_code || '').toLowerCase().includes(q);

    const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesVendor = selectedVendor === 'all' || p.vendor_id === selectedVendor;

    let matchesStock = true;
    if (selectedStockStatus === 'in_stock') matchesStock = p.quantity > p.min_stock_level;
    else if (selectedStockStatus === 'low_stock')
      matchesStock = p.quantity > 0 && p.quantity <= p.min_stock_level;
    else if (selectedStockStatus === 'out_of_stock') matchesStock = p.quantity === 0;

    return matchesSearch && matchesBrand && matchesCategory && matchesVendor && matchesStock;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mobile Phone & Accessory Inventory</h2>
          <p className="text-xs text-slate-500">
            Total {products.length} products listed • {products.filter((p) => p.is_imei_tracked).length} IMEI-tracked models
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedProduct(null);
            setIsFormModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* General Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, brand, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Brand Filter */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock Warning</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Dedicated Direct IMEI Search Drawer Trigger */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <Smartphone className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search or scan specific IMEI 1 / IMEI 2 / Serial to find phone status..."
              value={imeiSearchQuery}
              onChange={(e) => setImeiSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImeiSearch()}
              className="w-full pl-9 pr-24 py-1.5 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleImeiSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition"
            >
              Search IMEI
            </button>
          </div>

          {imeiSearchResults && (
            <button
              onClick={() => {
                setImeiSearchResults(null);
                setImeiSearchQuery('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear IMEI Filter
            </button>
          )}
        </div>

        {/* Display IMEI Instant Results if queried */}
        {imeiSearchResults && (
          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs space-y-2">
            <span className="font-bold text-indigo-900">
              IMEI Search Results ({imeiSearchResults.length} matched):
            </span>
            {imeiSearchResults.length === 0 ? (
              <p className="text-slate-500">No device found with this IMEI or Serial.</p>
            ) : (
              <div className="divide-y divide-indigo-100 font-mono">
                {imeiSearchResults.map((unit) => (
                  <div key={unit.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">
                        {unit.product?.name || 'Phone Unit'}
                      </span>
                      <div className="text-[11px] text-slate-600">
                        IMEI 1: {unit.imei_1} {unit.imei_2 ? `| IMEI 2: ${unit.imei_2}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          unit.status === 'available'
                            ? 'success'
                            : unit.status === 'sold'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {unit.status.toUpperCase()}
                      </Badge>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(unit.sale_price, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product & Specs</th>
                <th className="py-3 px-3">Brand & Category</th>
                <th className="py-3 px-3">Tracking</th>
                <th className="py-3 px-3 text-right">Purchase Cost</th>
                <th className="py-3 px-3 text-right">Sale Price</th>
                <th className="py-3 px-3 text-center">Stock Level</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No products match your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.quantity <= 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.min_stock_level;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      {/* Product & Specs */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {p.model && <span>Model: {p.model}</span>}
                          {p.color && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{p.color}</span>}
                          {p.storage && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{p.storage}</span>}
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{p.brand}</span>
                        <div className="text-[11px] text-slate-500">{p.category?.name || 'General'}</div>
                      </td>

                      {/* Tracking */}
                      <td className="py-3.5 px-3">
                        {p.is_imei_tracked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            <Smartphone className="w-3 h-3" />
                            <span>IMEI Tracked</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Standard Qty</span>
                        )}
                      </td>

                      {/* Purchase Cost */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-600">
                        {formatCurrency(p.purchase_price, currency)}
                      </td>

                      {/* Sale Price */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.sale_price, currency)}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {p.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Min: {p.min_stock_level}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}
                          size="sm"
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View IMEIs button for phone models */}
                          {p.is_imei_tracked && (
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setIsImeiDrawerOpen(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View registered IMEIs & Phone Units"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Quick Adjust stock */}
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsAdjustmentModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            title="Manual Stock Adjustment"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Archive Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        product={selectedProduct}
        categories={categories}
        vendors={vendors}
        onSave={handleSaveProduct}
        currency={currency}
      />

      <ImeiListDrawer
        isOpen={isImeiDrawerOpen}
        onClose={() => setIsImeiDrawerOpen(false)}
        product={selectedProduct}
        currency={currency}
      />

      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        product={selectedProduct}
        onSuccess={() => {
          showFeedback('Stock adjusted successfully.');
          loadData();
        }}
      />
    </div>
  );
};
