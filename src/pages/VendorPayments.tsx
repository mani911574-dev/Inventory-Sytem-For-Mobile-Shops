import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  History,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Vendor, VendorPayment, PaymentMethod, ShopSettings } from '../types';
import { vendorService } from '../services/vendorService';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

interface VendorPaymentsProps {
  initialVendorId?: string;
  settings?: ShopSettings;
}

export const VendorPayments: React.FC<VendorPaymentsProps> = ({
  initialVendorId,
  settings
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>(initialVendorId || 'all');
  const [loading, setLoading] = useState(true);

  // Record Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [targetVendor, setTargetVendor] = useState<Vendor | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currency = settings?.currency_symbol || 'Rs.';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialVendorId) {
      setSelectedVendorFilter(initialVendorId);
    }
  }, [initialVendorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [venData, payData] = await Promise.all([
        vendorService.getVendors(),
        vendorService.getVendorPayments()
      ]);
      setVendors(venData);
      setPayments(payData);
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

  const handleOpenPay = (vendor: Vendor) => {
    setTargetVendor(vendor);
    setPayAmount(vendor.current_balance > 0 ? vendor.current_balance : 0);
    setPaymentMethod('Cash');
    setReferenceNote('');
    setErrorMsg('');
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVendor || payAmount <= 0) return;

    try {
      setIsSubmitting(true);
      await vendorService.recordVendorPayment({
        vendor_id: targetVendor.id,
        amount: Number(payAmount),
        payment_method: paymentMethod,
        reference_note: referenceNote
      });

      showFeedback(
        `Payment of ${formatCurrency(payAmount, currency)} recorded for ${targetVendor.name}`
      );
      setIsPayModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOwed = vendors.reduce((acc, v) => acc + Number(v.current_balance), 0);

  const filteredPayments = payments.filter((p) => {
    return selectedVendorFilter === 'all' || p.vendor_id === selectedVendorFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vendor Payables & Payment Ledger</h2>
          <p className="text-xs text-slate-500">
            Track money owed to mobile suppliers, payment terms, schedules, and vouchers
          </p>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Building2 className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
              Total Outstanding Payables
            </span>
            <span className="text-base font-bold font-mono text-amber-900">
              {formatCurrency(totalOwed, currency)}
            </span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Vendors Outstanding Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Suppliers Balance Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => {
            const hasDue = v.current_balance > 0;
            return (
              <div
                key={v.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{v.name}</h4>
                      <p className="text-xs text-slate-500">{v.company_name || 'Wholesale Supplier'}</p>
                    </div>
                    <Badge variant={hasDue ? 'warning' : 'success'} size="sm">
                      {hasDue ? 'Balance Due' : 'Cleared'}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Payment Terms</span>
                      <span className="font-semibold text-slate-700">{v.payment_terms}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Schedule</span>
                      <span className="font-semibold text-slate-700">
                        {v.payment_terms === 'Weekly'
                          ? 'Every 7 Days'
                          : v.payment_terms === 'Monthly'
                          ? 'Every 30 Days'
                          : v.payment_terms}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Owed Amount
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        hasDue ? 'text-amber-700' : 'text-slate-700'
                      }`}
                    >
                      {formatCurrency(v.current_balance, currency)}
                    </span>
                  </div>

                  {hasDue ? (
                    <button
                      onClick={() => handleOpenPay(v)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">No Pending Dues</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Vendor Payment History</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter by Vendor:</span>
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-right">Remaining Balance</th>
                <th className="py-3 px-4">Notes / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-sans">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-sans">
                    No vendor payments recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.payment_number}</td>
                    <td className="py-3 px-3 text-slate-600 font-sans">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 font-sans">
                      {p.vendor?.name || 'Vendor'}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">
                      {formatCurrency(p.amount, currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatCurrency(p.remaining_balance, currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {p.reference_note || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Vendor Payment"
        subtitle={`Pay to: ${targetVendor?.name} (Current Outstanding: ${formatCurrency(
          targetVendor?.current_balance || 0,
          currency
        )})`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount ({currency}) *
            </label>
            <input
              type="number"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {targetVendor && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Remaining after payment:{' '}
                <strong className="font-mono text-slate-800">
                  {formatCurrency(Math.max(0, targetVendor.current_balance - payAmount), currency)}
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
              <option value="Bank">Bank Transfer (HBL / Meezan / etc.)</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Other">Other / Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Transaction ID / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Bank slip #9821, Paid from shop counter"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
