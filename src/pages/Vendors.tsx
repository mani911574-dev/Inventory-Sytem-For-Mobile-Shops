import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Building2,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Vendor, PaymentTerm, ShopSettings } from '../types';
import { vendorService } from '../services/vendorService';
import { formatCurrency } from '../utils/formatters';

interface VendorsProps {
  onNavigateToPayables: (vendorId?: string) => void;
  settings?: ShopSettings;
}

export const Vendors: React.FC<VendorsProps> = ({ onNavigateToPayables, settings }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    company_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    email: '',
    opening_balance: 0,
    payment_terms: 'Weekly',
    custom_term_days: 7,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currency = settings?.currency_symbol || 'Rs.';

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getVendors();
      setVendors(data);
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

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      company_name: '',
      phone: '',
      whatsapp: '',
      address: '',
      email: '',
      opening_balance: 0,
      payment_terms: 'Weekly',
      custom_term_days: 7,
      notes: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendor(v);
    setFormData({
      name: v.name,
      company_name: v.company_name || '',
      phone: v.phone || '',
      whatsapp: v.whatsapp || '',
      address: v.address || '',
      email: v.email || '',
      opening_balance: v.opening_balance,
      payment_terms: v.payment_terms,
      custom_term_days: v.custom_term_days || 7,
      notes: v.notes || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, formData);
        showFeedback(`Vendor "${formData.name}" updated!`);
      } else {
        await vendorService.createVendor(formData);
        showFeedback(`Vendor "${formData.name}" created!`);
      }
      setIsModalOpen(false);
      loadVendors();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to archive vendor "${name}"?`)) {
      try {
        await vendorService.deleteVendor(id);
        showFeedback(`Vendor "${name}" archived.`);
        loadVendors();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filtered = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.company_name || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vendors & Mobile Suppliers</h2>
          <p className="text-xs text-slate-500">
            Manage wholesale distributors, stockists, and payment terms
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vendor</span>
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
          placeholder="Search by vendor name, company, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
        />
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No vendors found</p>
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{v.name}</h3>
                      <p className="text-[11px] text-slate-500">{v.company_name || 'Wholesale Supplier'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id, v.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {v.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{v.phone}</span>
                    </div>
                  )}
                  {v.whatsapp && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <a
                        href={`https://wa.me/${v.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline font-mono"
                      >
                        {v.whatsapp}
                      </a>
                    </div>
                  )}
                  {v.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{v.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance & Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                    Payable Due
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      v.current_balance > 0 ? 'text-amber-700' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(v.current_balance, currency)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="purple" size="sm">
                    {v.payment_terms}
                  </Badge>
                  <button
                    onClick={() => onNavigateToPayables(v.id)}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    title="Pay Vendor"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}
        subtitle="Manage supplier profile and payment agreement terms"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor Contact Person *
              </label>
              <input
                type="text"
                placeholder="e.g. Tariq Mehmood"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop / Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Cellular Wholesalers"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="0321-1122334"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                placeholder="0321-1122334"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Terms Agreement
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value as PaymentTerm })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Immediate">Immediate (Cash on Delivery)</option>
                <option value="Daily">Daily Clearance</option>
                <option value="Weekly">Weekly (Every 7 Days)</option>
                <option value="Monthly">Monthly (Every 30 Days)</option>
                <option value="Custom">Custom Days</option>
              </select>
            </div>

            {formData.payment_terms === 'Custom' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Term Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.custom_term_days}
                  onChange={(e) => setFormData({ ...formData, custom_term_days: Number(e.target.value) || 7 })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opening Balance ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) || 0 })}
                disabled={!!editingVendor}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Market Location</label>
            <input
              type="text"
              placeholder="e.g. Shop 42, Hall Road, Lahore"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Products Supplied</label>
            <textarea
              rows={2}
              placeholder="e.g. Specializes in iPhone boxed stock..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
