import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Users,
  Phone,
  MessageCircle,
  MapPin,
  Edit2,
  Trash2,
  Clock,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Customer, Sale, CustomerPayment, ShopSettings } from '../types';
import { customerService } from '../services/customerService';
import { salesService } from '../services/salesService';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CustomersProps {
  onNavigateToUdhar: (customerId?: string) => void;
  settings?: ShopSettings;
}

export const Customers: React.FC<CustomersProps> = ({ onNavigateToUdhar, settings }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    notes: '',
    is_walk_in: false
  });

  // History Detail Modal
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currency = settings?.currency_symbol || 'Rs.';

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data);
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
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      address: '',
      notes: '',
      is_walk_in: false
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      address: c.address || '',
      notes: c.notes || '',
      is_walk_in: c.is_walk_in
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, formData);
        showFeedback(`Customer "${formData.name}" updated!`);
      } else {
        await customerService.createCustomer(formData);
        showFeedback(`Customer "${formData.name}" created!`);
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = async (customer: Customer) => {
    setViewingCustomer(customer);
    try {
      const [sales, payments] = await Promise.all([
        salesService.getSales({ customerId: customer.id }),
        customerService.getCustomerPayments(customer.id)
      ]);
      setCustomerSales(sales);
      setCustomerPayments(payments);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Customer Directory & Udhar Accounts</h2>
          <p className="text-xs text-slate-500">
            Registered phone buyers, walk-in shoppers, purchase ledgers, and credit history
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
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
          placeholder="Search by customer name, mobile, address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
        />
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No customers found</p>
          </div>
        ) : (
          filtered.map((c) => {
            const hasUdhar = Number(c.current_udhar) > 0;
            return (
              <div
                key={c.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{c.name}</h3>
                        <span className="text-[10px] text-slate-400 block">
                          {c.is_walk_in ? 'Default Walk-in Profile' : 'Registered Client'}
                        </span>
                      </div>
                    </div>

                    {!c.is_walk_in && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{c.phone}</span>
                      </div>
                    )}
                    {c.whatsapp && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline font-mono"
                        >
                          {c.whatsapp}
                        </a>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{c.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial metrics */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Total Purchases</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatCurrency(c.total_purchases, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Total Paid</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(c.total_paid, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Outstanding Udhar & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Current Udhar
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        hasUdhar ? 'text-purple-700' : 'text-slate-700'
                      }`}
                    >
                      {formatCurrency(c.current_udhar, currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleViewHistory(c)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="View Ledger & Invoices"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Ledger</span>
                    </button>
                    {hasUdhar && (
                      <button
                        onClick={() => onNavigateToUdhar(c.id)}
                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Udhar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer Profile'}
        subtitle="Manage customer contact and accounts"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Muhammad Bilal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone</label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Home / Shop Address</label>
            <input
              type="text"
              placeholder="e.g. Clifton Block 5, Karachi"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Additional remarks or guarantor details..."
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
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CUSTOMER LEDGER & INVOICE HISTORY MODAL */}
      <Modal
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        title={`Customer Ledger: ${viewingCustomer?.name}`}
        subtitle={`Current Udhar: ${formatCurrency(viewingCustomer?.current_udhar || 0, currency)}`}
        maxWidth="3xl"
      >
        {viewingCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400">Total Invoiced:</span>
                <p className="font-bold text-slate-900 font-mono">
                  {formatCurrency(viewingCustomer.total_purchases, currency)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Total Paid:</span>
                <p className="font-bold text-emerald-600 font-mono">
                  {formatCurrency(viewingCustomer.total_paid, currency)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Active Debt (Udhar):</span>
                <p className="font-bold text-purple-700 font-mono">
                  {formatCurrency(viewingCustomer.current_udhar, currency)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Purchases & Invoices ({customerSales.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Invoice</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Bill</th>
                      <th className="py-2 px-3 text-right">Paid</th>
                      <th className="py-2 px-3 text-right">Udhar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {customerSales.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 px-3 font-bold">{s.invoice_number}</td>
                        <td className="py-2 px-3 font-sans text-slate-500">
                          {formatDate(s.sale_date)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrency(s.total_amount, currency)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600">
                          {formatCurrency(s.paid_amount, currency)}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-700 font-bold">
                          {formatCurrency(s.remaining_amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Udhar Installment Receipts ({customerPayments.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Receipt #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Amount Received</th>
                      <th className="py-2 px-3 text-right">Remaining Debt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {customerPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                          No installment vouchers recorded.
                        </td>
                      </tr>
                    ) : (
                      customerPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-bold">{p.receipt_number}</td>
                          <td className="py-2 px-3 font-sans text-slate-500">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="py-2 px-3 font-sans">{p.payment_method}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                            {formatCurrency(p.amount, currency)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {formatCurrency(p.remaining_udhar, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
