import { supabase } from './supabaseClient';
import { ShopSettings } from '../types';

export const settingsService = {
  async getShopSettings() {
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as ShopSettings;

    // Fallback default
    return {
      id: 'default',
      shop_name: 'TechMobile Solutions',
      owner_name: 'Shop Admin',
      phone: '0300-1234567',
      whatsapp: '0300-1234567',
      email: 'contact@techmobile.pk',
      address: 'Shop #14, Star City Mall, Saddar, Karachi',
      currency_symbol: 'Rs.',
      invoice_prefix: 'INV-',
      purchase_prefix: 'PO-',
      receipt_footer: 'Thank you for your purchase! Warranty valid with original invoice and box.'
    } as ShopSettings;
  },

  async updateShopSettings(updates: Partial<ShopSettings>) {
    const current = await this.getShopSettings();
    if (current.id && current.id !== 'default') {
      const { data, error } = await supabase
        .from('shop_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select()
        .single();
      if (error) throw error;
      return data as ShopSettings;
    } else {
      const { data, error } = await supabase
        .from('shop_settings')
        .insert(updates)
        .select()
        .single();
      if (error) throw error;
      return data as ShopSettings;
    }
  }
};
