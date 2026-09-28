import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Smartphone, Users, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Customer, PaymentMethod, PaymentTerm } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discount: number;
  netTotal: number;
  customers: Customer[];
  onCompleteSale: (paymentData: {
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    paid_amount: number;
    payment_method: PaymentMethod;
    payment_details?: Record<string, number>;
    payment_terms: PaymentTerm;
    payment_due_date?: string;
    notes?: string;
  }) => Promise<void>;
  currency?: string;
}

export const PosPaymentModal: React.FC<PosPaymentModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  discount,
  netTotal,
  customers,
  onCompleteSale,
  currency = 'Rs.'
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState<number>(netTotal);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm>('Immediate');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mixed payment breakdown
  const [isMixed, setIsMixed] = useState(false);
  const [mixedCash, setMixedCash] = useState<number>(0);
  const [mixedOnline, setMixedOnline] = useState<number>(0);

  useEffect(() => {
    setAmountReceived(netTotal);
    // Set default due date to 7 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
  }, [netTotal, isOpen]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
    } else {
      const cust = customers.find((c) => c.id === customerId);
      if (cust) {
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone || '');
      }
    }
  };

  const changeReturn = Math.max(0, amountReceived - netTotal);
  const remainingUdhar = Math.max(0, netTotal - amountReceived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (remainingUdhar > 0 && customerName === 'Walk-in Customer' && !customerPhone) {
      setErrorMsg('For credit (Udhar) sales, please select a registered customer or provide a customer name & phone.');
      return;
    }

    try {
      setIsProcessing(true);
      const paymentDetails = isMixed
        ? { cash: mixedCash, online: mixedOnline }
        : undefined;

      await onCompleteSale({
        customer_id: selectedCustomerId || undefined,
        customer_name: customerName,
        customer_phone: customerPhone,
        paid_amount: Number(amountReceived),
        payment_method: isMixed ? 'Mixed' : paymentMethod,
        payment_details: paymentDetails,
        payment_terms: remainingUdhar > 0 ? paymentTerms : 'Immediate',
        payment_due_date: remainingUdhar > 0 ? dueDate : undefined,
        notes
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Payment & Checkout"
      subtitle={`Total Bill: ${formatCurrency(netTotal, currency)}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Customer Select */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Customer Information</span>
            </label>
            {selectedCustomerId && (
              <span className="text-xs text-indigo-600 font-semibold">Registered Client</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Walk-in Customer (Default)</option>
                {customers
                  .filter((c) => !c.is_walk_in)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {c.current_udhar > 0 ? `[Udhar: Rs. ${c.current_udhar}]` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Mobile / WhatsApp</label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Notes / Warranty Notes</label>
              <input
                type="text"
                placeholder="Optional notes or remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Payment Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'Cash', label: 'Cash', icon: Banknote },
              { id: 'Easypaisa', label: 'Easypaisa', icon: Smartphone },
              { id: 'JazzCash', label: 'JazzCash', icon: Smartphone },
              { id: 'Bank', label: 'Bank Transfer', icon: CreditCard },
              { id: 'Card', label: 'Debit / Card', icon: CreditCard },
              { id: 'Udhar', label: 'Udhar / Credit', icon: Users },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.id as PaymentMethod);
                    if (m.id === 'Udhar') {
                      setAmountReceived(0);
                    } else if (amountReceived === 0) {
                      setAmountReceived(netTotal);
                    }
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Received Calculation */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-400">Total Payable</span>
              <p className="text-xl font-bold">{formatCurrency(netTotal, currency)}</p>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Amount Received ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-lg font-bold text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>

            <div>
              {changeReturn > 0 ? (
                <div>
                  <span className="text-xs text-emerald-400 font-semibold">Change to Return</span>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatCurrency(changeReturn, currency)}
                  </p>
                </div>
              ) : remainingUdhar > 0 ? (
                <div>
                  <span className="text-xs text-amber-400 font-semibold">Customer Udhar</span>
                  <p className="text-xl font-bold text-amber-400">
                    {formatCurrency(remainingUdhar, currency)}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-400">Balance</span>
                  <p className="text-xl font-bold text-slate-300">Exact Paid</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400 self-center mr-1">Quick Select:</span>
            {[netTotal, Math.ceil(netTotal / 500) * 500, Math.ceil(netTotal / 1000) * 1000].map(
              (amt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAmountReceived(amt)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-md font-mono"
                >
                  {formatCurrency(amt, currency)}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setAmountReceived(0)}
              className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-900 text-xs text-amber-200 rounded-md"
            >
              Full Udhar
            </button>
          </div>
        </div>

        {/* If Udhar is remaining, show Payment Terms & Due Date */}
        {remainingUdhar > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Customer Credit Schedule (Udhar of {formatCurrency(remainingUdhar, currency)})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value as PaymentTerm)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none"
                >
                  <option value="Weekly">Weekly (7 Days)</option>
                  <option value="Daily">Daily</option>
                  <option value="Monthly">Monthly (30 Days)</option>
                  <option value="Custom">Custom Date</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Recovery Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{isProcessing ? 'Processing...' : 'Complete & Print Invoice'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
