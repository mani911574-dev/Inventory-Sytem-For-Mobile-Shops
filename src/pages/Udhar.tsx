import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  MessageCircle,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  History,
  AlertCircle,
  Printer
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { StatsCard } from '../components/common/StatsCard';
import { Customer, Sale, CustomerPayment, PaymentMethod, ShopSettings } from '../types';
import { customerService } from '../services/customerService';
import { salesService } from '../services/salesService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

interface UdharProps {
  initialCustomerId?: string;
  settings?: ShopSettings;
}

export const Udhar: React.FC<UdharProps> = ({ initialCustomerId, settings }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditSales, setCreditSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect Payment Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null);
  const [targetSale, setTargetSale] = useState<Sale | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [referenceNote, setReferenceNote] = useState('');
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
      const [custList, salesList, paymentList] = await Promise.all([
        customerService.getCustomers(),
        salesService.getSales(),
        customerService.getCustomerPayments()
      ]);

      setCustomers(custList);
      // Filter sales that had Udhar or are not fully paid
      const uSales = salesList.filter((s) => Number(s.remaining_amount) > 0 || s.payment_status !== 'Paid');
      setCreditSales(uSales);
      setPayments(paymentList);
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

  const handleOpenCollect = (customer: Customer, sale?: Sale) => {
    setTargetCustomer(customer);
    setTargetSale(sale || null);
    const defaultAmt = sale ? Number(sale.remaining_amount) : Number(customer.current_udhar);
    setCollectAmount(defaultAmt);
    setPaymentMethod('Cash');
    setReferenceNote('');
    setErrorMsg('');
    setIsCollectModalOpen(true);
  };

  const handleSubmitCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer || collectAmount <= 0) return;

    try {
      setIsSubmitting(true);
      await customerService.recordCustomerPayment({
        customer_id: targetCustomer.id,
        sale_id: targetSale ? targetSale.id : undefined,
        amount: Number(collectAmount),
        payment_method: paymentMethod,
        reference_note: referenceNote
      });

      showFeedback(
        `Collected ${formatCurrency(collectAmount, currency)} from ${targetCustomer.name}`
      );
      setIsCollectModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording installment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPI calculations
  const totalUdhar = customers.reduce((acc, c) => acc + Number(c.current_udhar), 0);
  const nowStr = new Date().toISOString().split('T')[0];

  const overdueSales = creditSales.filter((s) => {
    if (!s.payment_due_date) return false;
    return s.payment_due_date < nowStr && Number(s.remaining_amount) > 0;
  });

  const totalOverdueAmount = overdueSales.reduce((acc, s) => acc + Number(s.remaining_amount), 0);

  // Filtered sales
  const filteredSales = creditSales.filter((s) => {
    const isOverdue = s.payment_due_date && s.payment_due_date < nowStr && Number(s.remaining_amount) > 0;
    if (statusFilter === 'overdue' && !isOverdue) return false;
    if (statusFilter === 'pending' && s.payment_status !== 'Pending') return false;
    if (statusFilter === 'partially_paid' && s.payment_status !== 'Partially Paid') return false;

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
          <h2 className="text-lg font-bold text-slate-900">Customer Udhar & Credit Ledger</h2>
          <p className="text-xs text-slate-500">
            Track receivables, due date recovery schedules, and partial installment collections
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Outstanding Udhar"
          value={formatCurrency(totalUdhar, currency)}
          subtitle={`${customers.filter((c) => Number(c.current_udhar) > 0).length} client(s) with debt`}
          icon={Clock}
          iconColor="text-purple-600 bg-purple-50"
        />
        <StatsCard
          title="Overdue Receivables"
          value={formatCurrency(totalOverdueAmount, currency)}
          subtitle={`${overdueSales.length} invoice(s) passed due date`}
          icon={AlertTriangle}
          iconColor="text-rose-600 bg-rose-50"
        />
        <StatsCard
          title="Recent Collections (Vouchers)"
          value={payments.length}
          subtitle="Installments recorded"
          icon={CreditCard}
          iconColor="text-emerald-600 bg-emerald-50"
        />
      </div>

      {/* Credit Sales Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice # or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Udhar ({creditSales.length})
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Overdue ({overdueSales.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === 'pending'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('partially_paid')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                statusFilter === 'partially_paid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Partially Paid
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer & Contact</th>
                <th className="py-3 px-3 text-right">Original Bill</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Remaining Udhar</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading Udhar ledgers...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    <p className="font-semibold text-slate-700">No matching credit sales found</p>
                    <p className="text-xs mt-1">All accounts cleared or filter returned 0 records.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isOverdue =
                    sale.payment_due_date &&
                    sale.payment_due_date < nowStr &&
                    Number(sale.remaining_amount) > 0;
                  const matchingCustomer = customers.find((c) => c.id === sale.customer_id);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {sale.invoice_number}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{formatDate(sale.sale_date)}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900">{sale.customer_name}</div>
                        {sale.customer_phone && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {sale.customer_phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                        {formatCurrency(sale.total_amount, currency)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency(sale.paid_amount, currency)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-purple-700 text-sm">
                        {formatCurrency(sale.remaining_amount, currency)}
                      </td>
                      <td className="py-3.5 px-3">
                        {sale.payment_due_date ? (
                          <span
                            className={`font-mono text-xs font-semibold ${
                              isOverdue ? 'text-rose-600' : 'text-slate-600'
                            }`}
                          >
                            {formatDate(sale.payment_due_date)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={isOverdue ? 'danger' : sale.payment_status === 'Partially Paid' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {isOverdue ? 'Overdue' : sale.payment_status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Reminder Button */}
                          {sale.customer_phone && (
                            <a
                              href={`https://wa.me/${sale.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Assalam-o-Alaikum ${sale.customer_name}, this is a gentle reminder regarding invoice #${sale.invoice_number} from ${
                                  settings?.shop_name || 'TechMobile'
                                }. Your remaining balance is ${formatCurrency(
                                  sale.remaining_amount,
                                  currency
                                )}${
                                  sale.payment_due_date
                                    ? ` due by ${formatDate(sale.payment_due_date)}`
                                    : ''
                                }. Thank you.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* Collect Installment Button */}
                          {Number(sale.remaining_amount) > 0 && matchingCustomer && (
                            <button
                              onClick={() => handleOpenCollect(matchingCustomer, sale)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            >
                              Collect
                            </button>
                          )}
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

      {/* COLLECT INSTALLMENT MODAL */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="Record Customer Udhar Installment"
        subtitle={`Customer: ${targetCustomer?.name} ${
          targetSale ? `(Against Invoice: ${targetSale.invoice_number})` : ''
        }`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCollect} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
            <span className="text-purple-800 font-semibold">Total Customer Udhar:</span>
            <span className="font-mono font-bold text-sm text-purple-900">
              {formatCurrency(targetCustomer?.current_udhar || 0, currency)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Received ({currency}) *
            </label>
            <input
              type="number"
              min="1"
              value={collectAmount}
              onChange={(e) => setCollectAmount(Number(e.target.value) || 0)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {targetCustomer && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Remaining Udhar after this payment:{' '}
                <strong className="font-mono text-slate-800">
                  {formatCurrency(
                    Math.max(0, Number(targetCustomer.current_udhar) - collectAmount),
                    currency
                  )}
                </strong>
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt Note / Reference
            </label>
            <input
              type="text"
              placeholder="e.g. Paid at shop counter in Cash"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCollectModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Payment & Print Voucher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
