import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Database
} from 'lucide-react';
import { ShopSettings } from '../types';
import { settingsService } from '../services/settingsService';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface SettingsProps {
  onSettingsUpdated: (newSettings: ShopSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsUpdated }) => {
  const [formData, setFormData] = useState<Partial<ShopSettings>>({
    shop_name: 'TechMobile Solutions',
    owner_name: 'Mani Tech',
    phone: '0300-1234567',
    whatsapp: '0300-1234567',
    email: 'contact@techmobile.pk',
    address: 'Shop #14, Star City Mall, Saddar, Karachi',
    currency_symbol: 'Rs.',
    invoice_prefix: 'INV-',
    purchase_prefix: 'PO-',
    receipt_footer: 'Warranty Claim requires original receipt & box. Checking warranty 7 days.'
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getShopSettings();
      setFormData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMsg('');
      const updated = await settingsService.updateShopSettings(formData);
      onSettingsUpdated(updated);
      setFeedbackMsg('Shop settings saved and updated across all modules!');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Shop Profile & Settings</h2>
        <p className="text-xs text-slate-500">
          Configure business details, receipts, currency symbol, and billing preferences
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Shop Details & Branding</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop / Business Name *
              </label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner / Manager Name
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop Address / Market Location
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Invoice & Receipts Configuration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Invoicing & Receipt Formatting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Order Prefix
              </label>
              <input
                type="text"
                value={formData.purchase_prefix}
                onChange={(e) => setFormData({ ...formData, purchase_prefix: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt Warranty / Terms Policy Footer Note
            </label>
            <textarea
              rows={3}
              value={formData.receipt_footer}
              onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Database & Cloud Connection Status Card */}
        <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Backend Connection Status
              </span>
            </div>
            {isSupabaseConfigured ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Supabase Connected
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                Disconnected / Pending Setup
              </span>
            )}
          </div>

          <div className="text-xs space-y-1 text-slate-400 font-mono">
            <div>
              Host:{' '}
              <span className="text-slate-200">
                {isSupabaseConfigured
                  ? import.meta.env.VITE_SUPABASE_URL
                  : 'Not connected. Please add dedicated VITE_SUPABASE_URL to .env'}
              </span>
            </div>
            <div>
              Engine: <span className="text-slate-200">PostgreSQL with Row Level Security</span>
            </div>
            <div>
              Tracking Mode:{' '}
              <span className="text-indigo-400">Unit-Level Dual SIM IMEI + Real-time Sync</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
