import { supabase } from './supabaseClient';
import { Return, ReturnItem, PaymentMethod } from '../types';

export interface ReturnItemInput {
  sale_item_id: string;
  product_id: string;
  inventory_item_id?: string;
  imei_1?: string;
  imei_2?: string;
  quantity: number;
  refund_unit_price: number;
  total_refund: number;
}

export interface CreateReturnInput {
  sale_id: string;
  customer_id?: string;
  refund_amount: number;
  refund_payment_method: PaymentMethod;
  reason?: string;
  items: ReturnItemInput[];
}

export const returnsService = {
  async getReturns() {
    const { data, error } = await supabase
      .from('returns')
      .select('*, sale:sales(*), customer:customers(*), items:return_items(*, product:products(*))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Return[];
  },

  async processReturn(input: CreateReturnInput) {
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

    // 1. Create Return record
    const { data: retRecord, error: retError } = await supabase
      .from('returns')
      .insert({
        return_number: returnNumber,
        sale_id: input.sale_id,
        customer_id: input.customer_id || null,
        refund_amount: input.refund_amount,
        refund_payment_method: input.refund_payment_method,
        reason: input.reason
      })
      .select()
      .single();

    if (retError) throw retError;

    // 2. Process return items and restore inventory
    for (const item of input.items) {
      // Insert return item
      await supabase
        .from('return_items')
        .insert({
          return_id: retRecord.id,
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          inventory_item_id: item.inventory_item_id || null,
          imei_1: item.imei_1 || null,
          imei_2: item.imei_2 || null,
          quantity: item.quantity,
          refund_unit_price: item.refund_unit_price,
          total_refund: item.total_refund
        });

      // Mark sale item as returned
      await supabase
        .from('sale_items')
        .update({ is_returned: true })
        .eq('id', item.sale_item_id);

      // If IMEI tracked item, restore IMEI status to 'available'
      if (item.inventory_item_id) {
        await supabase
          .from('inventory_items')
          .update({
            status: 'available',
            sold_sale_id: null,
            sold_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.inventory_item_id);

        // Fetch product info for logging
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product_id)
          .single();

        await supabase
          .from('stock_transactions')
          .insert({
            product_id: item.product_id,
            inventory_item_id: item.inventory_item_id,
            transaction_type: 'sale_return',
            quantity_change: 1,
            previous_quantity: product ? product.quantity : 0,
            new_quantity: product ? product.quantity + 1 : 1,
            unit_cost: item.refund_unit_price,
            reference_type: 'return',
            reference_id: retRecord.id,
            reason: `Return ${returnNumber}: Restored IMEI ${item.imei_1 || ''}`
          });
      } else {
        // Non-IMEI item: increment product quantity directly
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product_id)
          .single();

        const prevQty = product ? product.quantity : 0;
        const newQty = prevQty + item.quantity;

        await supabase
          .from('products')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', item.product_id);

        await supabase
          .from('stock_transactions')
          .insert({
            product_id: item.product_id,
            transaction_type: 'sale_return',
            quantity_change: item.quantity,
            previous_quantity: prevQty,
            new_quantity: newQty,
            unit_cost: item.refund_unit_price,
            reference_type: 'return',
            reference_id: retRecord.id,
            reason: `Return ${returnNumber}`
          });
      }
    }

    // 3. Update Sale status
    await supabase
      .from('sales')
      .update({ status: 'returned', updated_at: new Date().toISOString() })
      .eq('id', input.sale_id);

    return retRecord as Return;
  }
};
