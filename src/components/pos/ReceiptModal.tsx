import React from 'react';
import { Printer, CheckCircle2, Download, Share2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Sale, ShopSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings?: ShopSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = settings?.currency_symbol || 'Rs.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Completed Successfully"
      subtitle={`Invoice: ${sale.invoice_number}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Success Banner */}
        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">Transaction Finalized!</span> Inventory and customer ledger updated.
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          id="printable-receipt"
          className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm font-mono text-xs text-slate-800 space-y-4 mx-auto max-w-sm"
        >
          {/* Shop Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              {settings?.shop_name || 'TechMobile Solutions'}
            </h2>
            <p className="text-[11px] text-slate-600">{settings?.address}</p>
            <p className="text-[11px] text-slate-600">
              Tel: {settings?.phone} {settings?.whatsapp ? `| WA: ${settings?.whatsapp}` : ''}
            </p>
          </div>

          {/* Invoice Meta */}
          <div className="text-[11px] space-y-1 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>Invoice #:</span>
              <span className="font-bold text-slate-900">{sale.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(sale.sale_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-semibold">{sale.customer_name}</span>
            </div>
            {sale.customer_phone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{sale.customer_phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span className="font-semibold">{sale.payment_method}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between font-bold text-[11px] border-b border-slate-200 pb-1">
              <span>ITEM</span>
              <span>QTY × RATE</span>
              <span>TOTAL</span>
            </div>
            {(sale.items || []).map((item, idx) => (
              <div key={idx} className="space-y-0.5 text-[11px]">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-900">{item.product_name}</span>
                  <span>{formatCurrency(item.line_total, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>
                    {item.quantity} × {formatCurrency(item.unit_price, currency)}
                  </span>
                  {Number(item.discount_amount) > 0 && (
                    <span className="text-emerald-600 font-medium">
                      Disc: -{formatCurrency(item.discount_amount, currency)}
                    </span>
                  )}
                </div>
                {/* Print IMEI for phones */}
                {(item.imei_1 || item.imei_2) && (
                  <div className="bg-slate-50 border border-slate-200 p-1.5 rounded text-[10px] space-y-0.5 text-slate-700">
                    {item.imei_1 && (
                      <div>
                        <span className="font-bold">IMEI 1:</span> {item.imei_1}
                      </div>
                    )}
                    {item.imei_2 && (
                      <div>
                        <span className="font-bold">IMEI 2:</span> {item.imei_2}
                      </div>
                    )}
                    {item.serial_number && (
                      <div>
                        <span className="font-bold">S/N:</span> {item.serial_number}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals Calculation */}
          <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal, currency)}</span>
            </div>
            {Number(sale.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount_amount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Bill:</span>
              <span>{formatCurrency(sale.total_amount, currency)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Amount Paid:</span>
              <span>{formatCurrency(sale.paid_amount, currency)}</span>
            </div>
            {Number(sale.remaining_amount) > 0 && (
              <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1 rounded">
                <span>Customer Udhar (Due):</span>
                <span>{formatCurrency(sale.remaining_amount, currency)}</span>
              </div>
            )}
            {sale.payment_due_date && Number(sale.remaining_amount) > 0 && (
              <div className="flex justify-between text-[10px] text-amber-800">
                <span>Udhar Due Date:</span>
                <span>{sale.payment_due_date}</span>
              </div>
            )}
          </div>

          {/* Receipt Footer Policy */}
          <div className="text-center text-[10px] text-slate-500 space-y-1">
            <p>{settings?.receipt_footer || 'Thank you for your business!'}</p>
            <p className="font-medium text-slate-400">Software by TechMobile</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
