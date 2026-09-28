import React, { useState } from 'react';
import { RotateCcw, Search, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Sale, SaleItem, PaymentMethod } from '../../types';
import { returnsService } from '../../services/returnsService';
import { salesService } from '../../services/salesService';
import { formatCurrency } from '../../utils/formatters';

interface ReturnFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnSuccess: () => void;
  currency?: string;
}

export const ReturnFormModal: React.FC<ReturnFormModalProps> = ({
  isOpen,
  onClose,
  onReturnSuccess,
  currency = 'Rs.'
}) => {
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [searchedSale, setSearchedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('Cash');
  const [reason, setReason] = useState('Customer Return');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSearchedSale(null);
    setSelectedItems({});

    const q = invoiceQuery.trim();
    if (!q) return;

    try {
      const sales = await salesService.getSales();
      const match = sales.find((s) => s.invoice_number.toLowerCase() === q.toLowerCase());
      if (!match) {
        setErrorMsg(`No invoice found with number "${q}".`);
        return;
      }
      setSearchedSale(match);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error searching invoice');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Calculate total refund
  const itemsToReturn = (searchedSale?.items || []).filter((item) => selectedItems[item.id]);
  const totalRefundAmount = itemsToReturn.reduce((sum, item) => sum + Number(item.line_total), 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedSale || itemsToReturn.length === 0) {
      setErrorMsg('Please select at least one item to return.');
      return;
    }

    try {
      setIsSubmitting(true);
      await returnsService.processReturn({
        sale_id: searchedSale.id,
        customer_id: searchedSale.customer_id,
        refund_amount: totalRefundAmount,
        refund_payment_method: refundMethod,
        reason,
        items: itemsToReturn.map((item) => ({
          sale_item_id: item.id,
          product_id: item.product_id,
          inventory_item_id: item.inventory_item_id,
          imei_1: item.imei_1,
          imei_2: item.imei_2,
          quantity: item.quantity,
          refund_unit_price: item.unit_price,
          total_refund: item.line_total
        }))
      });

      onReturnSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Sales Return & IMEI Restock"
      subtitle="Restore inventory and reset returned IMEI to available status"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Invoice Lookup Form */}
        <form onSubmit={handleSearchInvoice} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter Invoice # (e.g. INV-2026-0001)..."
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Find Invoice
          </button>
        </form>

        {/* If Invoice Found */}
        {searchedSale && (
          <form onSubmit={handleSubmitReturn} className="space-y-4 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Invoice: {searchedSale.invoice_number}</span>
                <span>Total: {formatCurrency(searchedSale.total_amount, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Customer: {searchedSale.customer_name}</span>
                <span>Date: {new Date(searchedSale.sale_date).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Items to Return:
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(searchedSale.items || []).map((item) => (
                  <label
                    key={item.id}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                      selectedItems[item.id]
                        ? 'border-indigo-600 bg-indigo-50/40'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selectedItems[item.id]}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 text-xs block">
                          {item.product_name}
                        </span>
                        {item.imei_1 && (
                          <span className="text-[11px] font-mono text-indigo-700 flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            IMEI: {item.imei_1}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-mono font-bold text-xs text-slate-800">
                      {formatCurrency(item.line_total, currency)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Refund Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="Cash">Cash Refund</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Reason for Return</label>
                <input
                  type="text"
                  placeholder="e.g. Hardware fault, box change, customer mind changed"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Total Refund Banner */}
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300">Total Refund Payable:</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {formatCurrency(totalRefundAmount, currency)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalRefundAmount === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Return & Restore Stock'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
