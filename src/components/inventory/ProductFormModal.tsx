import React, { useState, useEffect } from 'react';
import { Smartphone, Tag, ShieldCheck, DollarSign } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Product, Category, Vendor } from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  vendors: Vendor[];
  onSave: (productData: Partial<Product>) => Promise<void>;
  currency?: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  vendors,
  onSave,
  currency = 'Rs.'
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    model: '',
    category_id: '',
    vendor_id: '',
    is_imei_tracked: true,
    variant: '',
    color: '',
    storage: '',
    ram: '',
    purchase_price: 0,
    sale_price: 0,
    min_stock_level: 2,
    quantity: 0,
    warranty_info: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand,
        model: product.model || '',
        category_id: product.category_id || '',
        vendor_id: product.vendor_id || '',
        is_imei_tracked: product.is_imei_tracked,
        variant: product.variant || '',
        color: product.color || '',
        storage: product.storage || '',
        ram: product.ram || '',
        purchase_price: product.purchase_price,
        sale_price: product.sale_price,
        min_stock_level: product.min_stock_level,
        quantity: product.quantity,
        warranty_info: product.warranty_info || '',
        notes: product.notes || ''
      });
    } else {
      setFormData({
        name: '',
        brand: '',
        model: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        vendor_id: vendors.length > 0 ? vendors[0].id : '',
        is_imei_tracked: true,
        variant: '',
        color: '',
        storage: '',
        ram: '',
        purchase_price: 0,
        sale_price: 0,
        min_stock_level: 2,
        quantity: 0,
        warranty_info: '1 Year Official Warranty',
        notes: ''
      });
    }
  }, [product, isOpen, categories, vendors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name?.trim() || !formData.brand?.trim()) {
      setErrorMsg('Product name and brand are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Mobile Phone / Product' : 'Add New Mobile Phone / Product'}
      subtitle="Complete specifications, IMEI mode, and pricing"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* IMEI Tracked Switch */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950">IMEI Tracking Required?</h4>
              <p className="text-[11px] text-indigo-700">
                Enable for Mobile Phones, Tablets & Watches (tracks individual IMEI 1 & IMEI 2 per unit)
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_imei_tracked}
              onChange={(e) => setFormData({ ...formData, is_imei_tracked: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Apple iPhone 15 Pro Max"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Brand *</label>
            <input
              type="text"
              placeholder="e.g. Apple, Samsung, Xiaomi"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Model Number</label>
            <input
              type="text"
              placeholder="e.g. A3106 / SM-S928B"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Specs: Color, Storage, RAM */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Color</label>
            <input
              type="text"
              placeholder="e.g. Natural Titanium"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Storage</label>
            <input
              type="text"
              placeholder="e.g. 256GB"
              value={formData.storage}
              onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">RAM</label>
            <input
              type="text"
              placeholder="e.g. 8GB"
              value={formData.ram}
              onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Pricing & Min Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Cost ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sale Price ({currency}) *
            </label>
            <input
              type="number"
              min="0"
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) || 0 })}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Min Stock Level
            </label>
            <input
              type="number"
              min="0"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: Number(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Vendor & Warranty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Vendor</label>
            <select
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Select Vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.company_name || 'Vendor'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Details</label>
            <input
              type="text"
              placeholder="e.g. 1 Year Official / 7 Days Checking"
              value={formData.warranty_info}
              onChange={(e) => setFormData({ ...formData, warranty_info: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
          <textarea
            rows={2}
            placeholder="e.g. PTA Approved status, physical dual SIM, accessories in box..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
