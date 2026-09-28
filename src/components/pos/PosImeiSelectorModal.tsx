import React, { useState } from 'react';
import { Smartphone, Search, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Product, InventoryItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PosImeiSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  availableImeis: InventoryItem[];
  onSelectImei: (item: InventoryItem) => void;
  currency?: string;
}

export const PosImeiSelectorModal: React.FC<PosImeiSelectorModalProps> = ({
  isOpen,
  onClose,
  product,
  availableImeis,
  onSelectImei,
  currency = 'Rs.'
}) => {
  const [filterText, setFilterText] = useState('');

  if (!product) return null;

  const filteredItems = availableImeis.filter((unit) => {
    const q = filterText.toLowerCase();
    const imei1 = (unit.imei_1 || '').toLowerCase();
    const imei2 = (unit.imei_2 || '').toLowerCase();
    const serial = (unit.serial_number || '').toLowerCase();
    const color = (unit.color || '').toLowerCase();
    return imei1.includes(q) || imei2.includes(q) || serial.includes(q) || color.includes(q);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Individual Phone Unit (IMEI)"
      subtitle={`${product.name} • ${availableImeis.length} units in stock`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Search / Scan Barcode or IMEI */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Scan or type IMEI / Serial / Color to filter..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Warning if no units */}
        {availableImeis.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-semibold text-slate-800">No Available IMEI Units Found</p>
            <p className="text-xs">
              All physical units of this phone are marked as sold or out of stock. Please stock in new units via Purchases.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredItems.map((unit) => (
              <div
                key={unit.id}
                className="p-3.5 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-xl transition flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span className="font-mono font-bold text-sm text-slate-900">
                      IMEI 1: {unit.imei_1}
                    </span>
                    {unit.color && (
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {unit.color}
                      </span>
                    )}
                    {unit.storage && (
                      <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                        {unit.storage}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500 font-mono">
                    {unit.imei_2 && <span>IMEI 2: {unit.imei_2}</span>}
                    {unit.serial_number && <span>S/N: {unit.serial_number}</span>}
                    <span className="text-slate-400">
                      Cost: {formatCurrency(unit.purchase_price, currency)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectImei(unit);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Select Unit</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
