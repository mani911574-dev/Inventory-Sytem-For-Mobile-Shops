import { supabase } from './supabaseClient';
import { Purchase, PurchaseItem, Vendor } from '../types';

export interface PurchaseItemInput {
  product_id: string;
  quantity: number;
  unit_cost: number;
  imeis?: Array<{
    imei_1: string;
    imei_2?: string;
    serial_number?: string;
    color?: string;
    storage?: string;
    ram?: string;
  }>;
}

export interface CreatePurchaseInput {
  vendor_id: string;
  reference_invoice?: string;
  purchase_date?: string;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  payment_due_date?: string;
  notes?: string;
  items: PurchaseItemInput[];
}

export const purchaseService = {
  async getPurchases() {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, vendor:vendors(*), items:purchase_items(*, product:products(*))')
      .order('purchase_date', { ascending: false });
    if (error) throw error;
    return (data || []) as Purchase[];
  },

  async getPurchaseById(id: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, vendor:vendors(*), items:purchase_items(*, product:products(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Purchase;
  },

  async createPurchase(input: CreatePurchaseInput) {
    const purchaseNumber = `PO-${Date.now().toString().slice(-6)}`;
    const remainingAmount = Math.max(0, input.total_amount - input.paid_amount);
    const paymentStatus = remainingAmount === 0 ? 'Paid' : (input.paid_amount > 0 ? 'Partially Paid' : 'Pending');

    // 1. Create Purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        vendor_id: input.vendor_id,
        purchase_date: input.purchase_date || new Date().toISOString().split('T')[0],
        reference_invoice: input.reference_invoice,
        total_amount: input.total_amount,
        paid_amount: input.paid_amount,
        remaining_amount: remainingAmount,
        payment_status: paymentStatus,
        payment_due_date: input.payment_due_date,
        payment_method: input.payment_method,
        notes: input.notes
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. Insert items and update inventory
    for (const item of input.items) {
      // Insert purchase item
      const { data: pItem, error: itemError } = await supabase
        .from('purchase_items')
        .insert({
          purchase_id: purchase.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.quantity * item.unit_cost
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Check if product is IMEI tracked
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', item.product_id)
        .single();

      if (product) {
        if (product.is_imei_tracked && item.imeis && item.imeis.length > 0) {
          // Insert each IMEI unit into inventory_items
          const inventoryUnits = item.imeis.map(unit => ({
            product_id: item.product_id,
            imei_1: unit.imei_1.trim(),
            imei_2: unit.imei_2 ? unit.imei_2.trim() : null,
            serial_number: unit.serial_number ? unit.serial_number.trim() : null,
            color: unit.color || product.color,
            storage: unit.storage || product.storage,
            ram: unit.ram || product.ram,
            purchase_price: item.unit_cost,
            sale_price: product.sale_price,
            status: 'available',
            purchase_id: purchase.id,
            purchase_item_id: pItem.id
          }));

          const { error: imeiError } = await supabase
            .from('inventory_items')
            .insert(inventoryUnits);

          if (imeiError) throw imeiError;
          // Note: trg_sync_imei_quantity trigger automatically updates products.quantity!
        } else {
          // Non-IMEI item: directly increase products.quantity
          const newQty = Number(product.quantity) + Number(item.quantity);
          await supabase
            .from('products')
            .update({
              quantity: newQty,
              purchase_price: item.unit_cost,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id);
        }

        // Log Stock Transaction
        await supabase
          .from('stock_transactions')
          .insert({
            product_id: item.product_id,
            transaction_type: 'purchase',
            quantity_change: item.quantity,
            previous_quantity: product.quantity,
            new_quantity: Number(product.quantity) + Number(item.quantity),
            unit_cost: item.unit_cost,
            reference_type: 'purchase',
            reference_id: purchase.id,
            reason: `Purchase PO: ${purchaseNumber}`
          });
      }
    }

    // 3. Update vendor current_balance with remaining payable amount
    if (remainingAmount > 0) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('current_balance')
        .eq('id', input.vendor_id)
        .single();
      if (vendor) {
        const newBalance = Number(vendor.current_balance) + remainingAmount;
        await supabase
          .from('vendors')
          .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', input.vendor_id);
      }
    }

    // 4. If paid_amount > 0, log a vendor payment record
    if (input.paid_amount > 0) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('current_balance')
        .eq('id', input.vendor_id)
        .single();

      await supabase
        .from('vendor_payments')
        .insert({
          payment_number: `VP-${Date.now().toString().slice(-6)}`,
          vendor_id: input.vendor_id,
          purchase_id: purchase.id,
          amount: input.paid_amount,
          payment_date: input.purchase_date || new Date().toISOString().split('T')[0],
          payment_method: (input.payment_method as any) || 'Cash',
          reference_note: `Upfront payment for ${purchaseNumber}`,
          remaining_balance: vendor ? vendor.current_balance : 0
        });
    }

    return purchase as Purchase;
  }
};
