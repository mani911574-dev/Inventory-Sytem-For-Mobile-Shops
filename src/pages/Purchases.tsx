import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  PackagePlus,
  Building2,
  Trash2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Purchase, Vendor, Product, ShopSettings } from '../types';
import { purchaseService, PurchaseItemInput } from '../services/purchaseService';
import { vendorService } from '../services/vendorService';
import { productService } from '../services/productService';
import { formatCurrency, formatDate } from '../utils/formatters';

interface PurchasesProps {
  settings?: ShopSettings;
}

interface DraftPurchaseItem {
  product_id: string;
  product: Product;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  imeis: Array<{
    imei_1: string;
    imei_2: string;
    serial_number: string;
    color: string;
    storage: string;
  }>;
}

export const Purchases: React.FC<PurchasesProps> = ({ settings }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Stock In Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceInvoice, setReferenceInvoice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftPurchaseItem[]>([]);

  // Item selector in modal
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemCost, setItemCost] = useState<number>(0);

  // Detail Modal
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currency = settings?.currency_symbol || 'Rs.';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purData, venData, prodData] = await Promise.all([
        purchaseService.getPurchases(),
        vendorService.getVendors(),
        productService.getProducts()
      ]);
      setPurchases(purData);
      setVendors(venData);
      setProducts(prodData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleOpenNewPurchase = () => {
    setSelectedVendorId(vendors.length > 0 ? vendors[0].id : '');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setReferenceInvoice('');
    setPaymentMethod('Cash');
    setPaidAmount(0);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setPaymentDueDate(d.toISOString().split('T')[0]);
    setNotes('');
    setDraftItems([]);
    setSelectedProductToAdd(products.length > 0 ? products[0].id : '');
    setItemQuantity(1);
    setItemCost(products.length > 0 ? products[0].purchase_price : 0);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // When product selector changes in modal
  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductToAdd(prodId);
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      setItemCost(p.purchase_price);
    }
  };

  // Add line to draft purchase
  const handleAddDraftItem = () => {
    const product = products.find((p) => p.id === selectedProductToAdd);
    if (!product) return;

    const qty = Math.max(1, itemQuantity);
    const cost = Math.max(0, itemCost);

    // Prepare IMEI slots if IMEI tracked
    const imeis: Array<{
      imei_1: string;
      imei_2: string;
      serial_number: string;
      color: string;
      storage: string;
    }> = [];
    if (product.is_imei_tracked) {
      for (let i = 0; i < qty; i++) {
        imeis.push({
          imei_1: '',
          imei_2: '',
          serial_number: '',
          color: product.color || '',
          storage: product.storage || ''
        });
      }
    }

    setDraftItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product,
        quantity: qty,
        unit_cost: cost,
        total_cost: qty * cost,
        imeis
      }
    ]);

    // Reset item input
    setItemQuantity(1);
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update specific IMEI in draft item
  const handleImeiFieldChange = (
    itemIndex: number,
    unitIndex: number,
    field: 'imei_1' | 'imei_2' | 'serial_number' | 'color' | 'storage',
    value: string
  ) => {
    setDraftItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      const imeis = [...item.imeis];
      imeis[unitIndex] = { ...imeis[unitIndex], [field]: value };
      item.imeis = imeis;
      updated[itemIndex] = item;
      return updated;
    });
  };

  const totalPurchaseValue = draftItems.reduce((acc, item) => acc + item.total_cost, 0);
  const remainingVendorPayable = Math.max(0, totalPurchaseValue - paidAmount);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (draftItems.length === 0) {
      setErrorMsg('Please add at least one product to the purchase.');
      return;
    }

    // Validate that IMEI-tracked items have IMEI 1 provided
    for (const item of draftItems) {
      if (item.product.is_imei_tracked) {
        for (let i = 0; i < item.imeis.length; i++) {
          if (!item.imeis[i].imei_1.trim()) {
            setErrorMsg(
              `Please enter IMEI 1 for Unit #${i + 1} of "${item.product.name}". Every phone requires a primary IMEI.`
            );
            return;
          }
        }
      }
    }

    try {
      setIsSubmitting(true);
      await purchaseService.createPurchase({
        vendor_id: selectedVendorId,
        purchase_date: purchaseDate,
        reference_invoice: referenceInvoice,
        total_amount: totalPurchaseValue,
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod,
        payment_due_date: remainingVendorPayable > 0 ? paymentDueDate : undefined,
        notes,
        items: draftItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          imeis: item.imeis
        }))
      });

      showFeedback('Stock-in purchase saved and inventory successfully updated!');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.purchase_number.toLowerCase().includes(q) ||
      (p.vendor?.name || '').toLowerCase().includes(q) ||
      (p.reference_invoice || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Purchases & Stock In</h2>
          <p className="text-xs text-slate-500">
            Stock in mobile phones and accessories from wholesale vendors with IMEI entry
          </p>
        </div>

        <button
          onClick={handleOpenNewPurchase}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <PackagePlus className="w-4 h-4" />
          <span>New Stock In / Purchase</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by PO number, vendor, bill ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
        />
      </div>

      {/* Purchases List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Purchase #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">Ref Invoice</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Payable (Due)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <PackagePlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No purchases recorded yet</p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {pur.purchase_number}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">{formatDate(pur.purchase_date)}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {pur.vendor?.name || 'Unknown Vendor'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 font-mono">
                      {pur.reference_invoice || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(pur.total_amount, currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                      {formatCurrency(pur.paid_amount, currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-700">
                      {Number(pur.remaining_amount) > 0
                        ? formatCurrency(pur.remaining_amount, currency)
                        : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <Badge
                        variant={
                          pur.payment_status === 'Paid'
                            ? 'success'
                            : pur.payment_status === 'Partially Paid'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {pur.payment_status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setViewingPurchase(pur)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Purchase Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW STOCK IN MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Stock In / Vendor Purchase"
        subtitle="Add products, enter physical IMEIs, and calculate vendor balance"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmitPurchase} className="space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vendor & Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Vendor *
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.company_name || 'Wholesale'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor Bill / Reference #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-ABC-901"
                value={referenceInvoice}
                onChange={(e) => setReferenceInvoice(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Add Product Line Section */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Add Products to Stock In
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product / Phone Model
                </label>
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_imei_tracked ? '(IMEI Tracked)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Cost ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={itemCost}
                  onChange={(e) => setItemCost(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddDraftItem}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Draft Items List & Dynamic IMEI Input */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Purchase Items & IMEI Details ({draftItems.length})
            </h4>

            {draftItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                No items added yet. Select a product above and click "+ Add Item".
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {draftItems.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.product.name}</span>
                        {item.product.is_imei_tracked && (
                          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                            IMEI Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {item.quantity} × {formatCurrency(item.unit_cost, currency)} ={' '}
                          <span className="text-indigo-600">
                            {formatCurrency(item.total_cost, currency)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(itemIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* DYNAMIC IMEI ROWS FOR PHONES */}
                    {item.product.is_imei_tracked && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Enter Physical Phone Unit IMEIs (Primary IMEI 1 required per phone):
                        </span>
                        <div className="space-y-2">
                          {item.imeis.map((unit, unitIdx) => (
                            <div
                              key={unitIdx}
                              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 text-xs font-mono"
                            >
                              <span className="sm:col-span-1 font-bold text-slate-500 text-center font-sans">
                                #{unitIdx + 1}
                              </span>
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  placeholder="IMEI 1 (Required) *"
                                  value={unit.imei_1}
                                  onChange={(e) =>
                                    handleImeiFieldChange(
                                      itemIdx,
                                      unitIdx,
                                      'imei_1',
                                      e.target.value
                                    )
                                  }
                                  required
                                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  placeholder="IMEI 2 (Dual SIM)"
                                  value={unit.imei_2}
                                  onChange={(e) =>
                                    handleImeiFieldChange(
                                      itemIdx,
                                      unitIdx,
                                      'imei_2',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="text"
                                  placeholder="Color / Specs"
                                  value={unit.color}
                                  onChange={(e) =>
                                    handleImeiFieldChange(
                                      itemIdx,
                                      unitIdx,
                                      'color',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-sans focus:bg-white"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment & Vendor Payable Calculation */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-400">Total Purchase Value</span>
                <p className="text-xl font-bold font-mono">
                  {formatCurrency(totalPurchaseValue, currency)}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">
                  Amount Paid Now ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-lg font-bold text-white focus:ring-2 focus:ring-indigo-400 font-mono"
                />
              </div>

              <div>
                <span className="text-xs text-amber-400 font-semibold">
                  Remaining Vendor Payable
                </span>
                <p className="text-xl font-bold text-amber-400 font-mono">
                  {formatCurrency(remainingVendorPayable, currency)}
                </p>
              </div>
            </div>

            {remainingVendorPayable > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Scheduled Payment Due Date:</span>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Received via TCS / Courier parcel from Lahore market"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Stock In & Update Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW PURCHASE DETAIL MODAL */}
      <Modal
        isOpen={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={`Purchase Order: ${viewingPurchase?.purchase_number}`}
        subtitle={`Vendor: ${viewingPurchase?.vendor?.name}`}
        maxWidth="lg"
      >
        {viewingPurchase && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400">Date:</span>
                <p className="font-semibold">{formatDate(viewingPurchase.purchase_date)}</p>
              </div>
              <div>
                <span className="text-slate-400">Ref Bill:</span>
                <p className="font-mono">{viewingPurchase.reference_invoice || 'None'}</p>
              </div>
              <div>
                <span className="text-slate-400">Total:</span>
                <p className="font-bold text-slate-900 font-mono">
                  {formatCurrency(viewingPurchase.total_amount, currency)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Remaining Payable:</span>
                <p className="font-bold text-amber-700 font-mono">
                  {formatCurrency(viewingPurchase.remaining_amount, currency)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Purchased Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {(viewingPurchase.items || []).map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">
                        {item.product?.name || 'Item'}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        Qty: {item.quantity} × {formatCurrency(item.unit_cost, currency)}
                      </span>
                    </div>
                    <span className="font-bold font-mono">
                      {formatCurrency(item.total_cost, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
