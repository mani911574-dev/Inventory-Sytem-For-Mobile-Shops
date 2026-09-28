import React, { useState } from 'react';
import { SlidersHorizontal, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Product } from '../../types';
import { productService } from '../../services/productService';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess
}) => {
  const [changeType, setChangeType] = useState<'add' | 'subtract'>('add');
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>('Manual Adjustment');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const quantityChange = changeType === 'add' ? Number(qty) : -Number(qty);

    if (quantityChange < 0 && Math.abs(quantityChange) > product.quantity) {
      setErrorMsg(`Cannot subtract more than current stock (${product.quantity})`);
      return;
    }

    try {
      setIsSubmitting(true);
      await productService.adjustStock(product.id, quantityChange, reason, notes);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Stock Adjustment"
      subtitle={`${product.name} (Current Stock: ${product.quantity})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adjustment Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChangeType('add')}
              className={`py-2 text-xs font-bold rounded-lg border transition ${
                changeType === 'add'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              + Increase Stock
            </button>
            <button
              type="button"
              onClick={() => setChangeType('subtract')}
              className={`py-2 text-xs font-bold rounded-lg border transition ${
                changeType === 'subtract'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              - Decrease Stock
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 1)}
            required
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="Manual Adjustment">Manual Audit Correction</option>
            <option value="Damaged">Damaged / Broken in Shop</option>
            <option value="Lost">Lost / Missing</option>
            <option value="Sale Return">Customer Return (Untracked)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes</label>
          <input
            type="text"
            placeholder="Details or explanation for audit trail..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

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
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Save Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
