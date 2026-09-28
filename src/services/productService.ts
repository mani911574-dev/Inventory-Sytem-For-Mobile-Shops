import { supabase } from './supabaseClient';
import { Product, InventoryItem, ImeiStatus, StockTransaction } from '../types';

export const productService = {
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), vendor:vendors(*)')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || []) as Product[];
  },

  async getProductById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), vendor:vendors(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Product;
  },

  async createProduct(product: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        product_code: product.product_code || `PRD-${Date.now().toString().slice(-6)}`
      })
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  async getInventoryItems(productId?: string, status?: ImeiStatus) {
    let query = supabase
      .from('inventory_items')
      .select('*, product:products(*)');
    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as InventoryItem[];
  },

  async searchByImei(imei: string) {
    const cleanImei = imei.trim();
    if (!cleanImei) return [];
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, product:products(*)')
      .or(`imei_1.ilike.%${cleanImei}%,imei_2.ilike.%${cleanImei}%,serial_number.ilike.%${cleanImei}%`);
    if (error) throw error;
    return (data || []) as InventoryItem[];
  },

  async getStockTransactions(productId?: string) {
    let query = supabase
      .from('stock_transactions')
      .select('*, product:products(*)');
    if (productId) {
      query = query.eq('product_id', productId);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return (data || []) as StockTransaction[];
  },

  async adjustStock(productId: string, quantityChange: number, reason: string, notes?: string) {
    const product = await this.getProductById(productId);
    const prevQty = product.quantity;
    const newQty = Math.max(0, prevQty + quantityChange);

    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', productId);
    if (updateError) throw updateError;

    const { error: txError } = await supabase
      .from('stock_transactions')
      .insert({
        product_id: productId,
        transaction_type: quantityChange >= 0 ? 'manual_adjustment' : (reason === 'Damaged' ? 'damaged' : 'lost'),
        quantity_change: quantityChange,
        previous_quantity: prevQty,
        new_quantity: newQty,
        unit_cost: product.purchase_price,
        reference_type: 'adjustment',
        reason,
        notes
      });
    if (txError) throw txError;

    return newQty;
  }
};
