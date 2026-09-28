import React, { useState, useEffect } from 'react';
import { Smartphone, Search, AlertCircle, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Product, InventoryItem, ImeiStatus } from '../../types';
import { productService } from '../../services/productService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface ImeiListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  currency?: string;
}

export const ImeiListDrawer: React.FC<ImeiListDrawerProps> = ({
  isOpen,
  onClose,
  product,
  currency = 'Rs.'
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen && product) {
      loadUnits();
    }
  }, [isOpen, product]);

  const loadUnits = async () => {
    if (!product) return;
    try {
      setLoading(true);
      const units = await productService.getInventoryItems(product.id);
      setItems(units);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      (item.imei_1 || '').toLowerCase().includes(q) ||
      (item.imei_2 || '').toLowerCase().includes(q) ||
      (item.serial_number || '').toLowerCase().includes(q) ||
      (item.color || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: ImeiStatus) => {
    switch (status) {
      case 'available':
        return <Badge variant="success" size="sm">Available</Badge>;
      case 'sold':
        return <Badge variant="neutral" size="sm">Sold</Badge>;
      case 'returned':
        return <Badge variant="info" size="sm">Returned</Badge>;
      case 'damaged':
        return <Badge variant="danger" size="sm">Damaged</Badge>;
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Individual Phone Units & IMEI Registry"
      subtitle={`${product.name} • ${items.length} total units registered`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search IMEI 1 / IMEI 2 / Serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto overflow-x-auto pb-1">
            {['all', 'available', 'sold', 'returned', 'damaged'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st} ({st === 'all' ? items.length : items.filter((i) => i.status === st).length})
              </button>
            ))}
          </div>
        </div>

        {/* Table of IMEI units */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">IMEI Numbers</th>
                  <th className="py-2.5 px-3">Specs / Color</th>
                  <th className="py-2.5 px-3">Purchase Cost</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                      Loading IMEI units...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                      No matching IMEI units found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          IMEI 1: {unit.imei_1 || 'N/A'}
                        </div>
                        {unit.imei_2 && (
                          <div className="text-[11px] text-slate-500">
                            IMEI 2: {unit.imei_2}
                          </div>
                        )}
                        {unit.serial_number && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            S/N: {unit.serial_number}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <span className="font-medium text-slate-800 block">
                          {unit.color || product.color || 'Standard'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {unit.storage || product.storage || ''} {unit.ram ? `/ ${unit.ram}` : ''}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 font-bold">
                        {formatCurrency(unit.purchase_price, currency)}
                      </td>

                      <td className="py-3 px-3 font-sans">{getStatusBadge(unit.status)}</td>

                      <td className="py-3 px-3 font-sans text-slate-500 text-[11px]">
                        {unit.status === 'sold' ? (
                          <div>
                            <span className="font-semibold text-slate-700 block">Sold</span>
                            <span className="text-[10px] text-slate-400">
                              {unit.sold_at ? formatDateTime(unit.sold_at) : 'Historical'}
                            </span>
                          </div>
                        ) : unit.status === 'available' ? (
                          <span className="text-emerald-600 font-medium">Ready in stock</span>
                        ) : (
                          <span>{unit.notes || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
