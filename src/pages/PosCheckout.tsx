import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Smartphone,
  Tag,
  CreditCard,
  Barcode,
  Package,
  Check,
  AlertCircle
} from 'lucide-react';
import { Product, InventoryItem, Category, Customer, CartItem, Sale, ShopSettings } from '../types';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { customerService } from '../services/customerService';
import { salesService } from '../services/salesService';
import { PosImeiSelectorModal } from '../components/pos/PosImeiSelectorModal';
import { PosPaymentModal } from '../components/pos/PosPaymentModal';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { formatCurrency } from '../utils/formatters';

interface PosCheckoutProps {
  settings?: ShopSettings;
}

export const PosCheckout: React.FC<PosCheckoutProps> = ({ settings }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);

  // Modals state
  const [selectedProductForImei, setSelectedProductForImei] = useState<Product | null>(null);
  const [availableImeisForProduct, setAvailableImeisForProduct] = useState<InventoryItem[]>([]);
  const [isImeiModalOpen, setIsImeiModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const currency = settings?.currency_symbol || 'Rs.';

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData, custData] = await Promise.all([
        productService.getProducts(),
        categoryService.getCategories(),
        customerService.getCustomers()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setCustomers(custData);
    } catch (err) {
      console.error('Failed to load POS data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Direct IMEI Scan or Search handler
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim();
      // Check if matches an IMEI
      try {
        const imeiResults = await productService.searchByImei(q);
        const availableMatch = imeiResults.find((i) => i.status === 'available');

        if (availableMatch && availableMatch.product) {
          // Check if already in cart
          if (cart.some((c) => c.selectedImei?.id === availableMatch.id)) {
            showNotification(`IMEI ${availableMatch.imei_1} is already in the cart!`, 'error');
            return;
          }

          addItemToCart(availableMatch.product, availableMatch);
          setSearchQuery('');
          showNotification(`Scanned phone added: ${availableMatch.product.name} (IMEI: ${availableMatch.imei_1})`);
          return;
        }
      } catch (err) {
        console.error('Error scanning IMEI', err);
      }
    }
  };

  const handleProductClick = async (product: Product) => {
    if (product.quantity <= 0) {
      showNotification(`${product.name} is currently out of stock!`, 'error');
      return;
    }

    if (product.is_imei_tracked) {
      // Fetch available IMEI units for this specific product
      try {
        const units = await productService.getInventoryItems(product.id, 'available');
        // Exclude units already in cart
        const inCartImeiIds = new Set(cart.map((c) => c.selectedImei?.id).filter(Boolean));
        const filteredUnits = units.filter((u) => !inCartImeiIds.has(u.id));

        if (filteredUnits.length === 0) {
          showNotification('All available IMEI units for this product are already in your cart!', 'error');
          return;
        }

        setSelectedProductForImei(product);
        setAvailableImeisForProduct(filteredUnits);
        setIsImeiModalOpen(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Non-IMEI accessory: add directly
      addItemToCart(product);
    }
  };

  const addItemToCart = (product: Product, selectedImei?: InventoryItem) => {
    setCart((prev) => {
      // If IMEI item: each physical phone is a distinct cart entry of quantity 1
      if (selectedImei) {
        return [
          ...prev,
          {
            product,
            selectedImei,
            quantity: 1,
            unit_price: product.sale_price,
            unit_cost: selectedImei.purchase_price,
            discount: 0,
            line_total: product.sale_price
          }
        ];
      }

      // If non-IMEI item: increment quantity if already in cart
      const existingIndex = prev.findIndex((item) => item.product.id === product.id && !item.selectedImei);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + 1;
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          line_total: newQty * existing.unit_price - existing.discount
        };
        return updated;
      }

      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: product.sale_price,
          unit_cost: product.purchase_price,
          discount: 0,
          line_total: product.sale_price
        }
      ];
    });
  };

  const updateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const item = prev[index];
      // Do not allow quantity > 1 for unique IMEI units
      if (item.selectedImei && newQty > 1) {
        showNotification('Each IMEI phone unit must be scanned or selected individually.', 'error');
        return prev;
      }
      const updated = [...prev];
      updated[index] = {
        ...item,
        quantity: newQty,
        line_total: newQty * item.unit_price - item.discount
      };
      return updated;
    });
  };

  const updateCartLineDiscount = (index: number, disc: number) => {
    setCart((prev) => {
      const item = prev[index];
      const validDisc = Math.max(0, disc);
      const updated = [...prev];
      updated[index] = {
        ...item,
        discount: validDisc,
        line_total: Math.max(0, item.quantity * item.unit_price - validDisc)
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscount(0);
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const totalLineDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalDiscount = totalLineDiscounts + Number(billDiscount || 0);
  const netPayable = Math.max(0, cartSubtotal - totalDiscount);

  // Complete checkout action
  const handleCompleteSale = async (paymentData: any) => {
    const saleResult = await salesService.processCheckout({
      ...paymentData,
      subtotal: cartSubtotal,
      discount_amount: totalDiscount,
      tax_amount: 0,
      total_amount: netPayable,
      items: cart
    });

    setCompletedSale(saleResult);
    setIsReceiptModalOpen(true);
    clearCart();
    // Refresh product stock count
    loadData();
  };

  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'all' || prod.category_id === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      prod.name.toLowerCase().includes(q) ||
      prod.brand.toLowerCase().includes(q) ||
      (prod.model || '').toLowerCase().includes(q) ||
      (prod.product_code || '').toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-5.5rem)] overflow-hidden">
      {/* LEFT PANEL: PRODUCT CATALOG & SCANNER */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Scan Barcode / IMEI or search mobile name, model, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-24 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Scanner Active</span>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Catalog ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No matching products found</p>
              <p className="text-xs mt-1">Try another search term or check Category filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.quantity <= 0;
                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleProductClick(product)}
                    className={`relative p-3.5 rounded-xl border transition flex flex-col justify-between group ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {product.brand}
                        </span>
                        {product.is_imei_tracked && (
                          <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                            IMEI
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-2 transition">
                        {product.name}
                      </h4>
                      {product.variant && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {product.variant}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {formatCurrency(product.sale_price, currency)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700'
                            : product.quantity <= product.min_stock_level
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isOutOfStock ? '0' : `${product.quantity} left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CART & CHECKOUT LEDGER */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Active Cart</h3>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              {cart.length}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mx-3 mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
              notification.type === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Cart is Empty</p>
              <p className="text-xs text-slate-400 mt-1">
                Scan an IMEI or click a mobile / accessory on the left to begin sale.
              </p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={index}
                className="p-3 border border-slate-200 hover:border-slate-300 rounded-xl bg-white shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 truncate">
                      {item.product.name}
                    </h5>
                    <span className="text-xs font-semibold text-indigo-600">
                      {formatCurrency(item.unit_price, currency)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Prominent IMEI badge if phone */}
                {item.selectedImei && (
                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-lg p-1.5 text-[11px] font-mono text-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-semibold">IMEI 1:</span>
                      <span>{item.selectedImei.imei_1}</span>
                    </div>
                    {item.selectedImei.color && (
                      <span className="text-[10px] text-slate-500 font-sans">
                        {item.selectedImei.color}
                      </span>
                    )}
                  </div>
                )}

                {/* Quantity and Line Total */}
                <div className="flex items-center justify-between pt-1">
                  {!item.selectedImei ? (
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                      <button
                        onClick={() => updateCartQuantity(index, item.quantity - 1)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold font-mono text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(index, item.quantity + 1)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Qty: 1 Unit
                    </span>
                  )}

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {formatCurrency(item.line_total, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Checkout Trigger */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(cartSubtotal, currency)}
                </span>
              </div>

              {/* Bill Discount input */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Discount</span>
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={billDiscount || ''}
                  onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-0.5 text-right bg-white border border-slate-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Total</span>
                <span className="text-indigo-600 font-mono">
                  {formatCurrency(netPayable, currency)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-600/30 transition text-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>Checkout • {formatCurrency(netPayable, currency)}</span>
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <PosImeiSelectorModal
        isOpen={isImeiModalOpen}
        onClose={() => setIsImeiModalOpen(false)}
        product={selectedProductForImei}
        availableImeis={availableImeisForProduct}
        onSelectImei={(unit) => {
          if (selectedProductForImei) {
            addItemToCart(selectedProductForImei, unit);
            showNotification(`Added ${selectedProductForImei.name} (IMEI: ${unit.imei_1})`);
          }
        }}
        currency={currency}
      />

      <PosPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        subtotal={cartSubtotal}
        discount={totalDiscount}
        netTotal={netPayable}
        customers={customers}
        onCompleteSale={handleCompleteSale}
        currency={currency}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={completedSale}
        settings={settings}
      />
    </div>
  );
};
