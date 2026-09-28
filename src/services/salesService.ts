import { supabase } from './supabaseClient';
import { Sale, SaleItem, CartItem, PaymentMethod, PaymentTerm } from '../types';

export interface CheckoutInput {
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  payment_details?: Record<string, number>;
  payment_terms: PaymentTerm;
  payment_due_date?: string;
  notes?: string;
  items: CartItem[];
}

export const salesService = {
  async getSales(filter?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    paymentStatus?: string;
  }) {
    let query = supabase
      .from('sales')
      .select('*, customer:customers(*), items:sale_items(*, product:products(*))')
      .order('sale_date', { ascending: false });

    if (filter?.startDate) {
      query = query.gte('sale_date', `${filter.startDate}T00:00:00`);
    }
    if (filter?.endDate) {
      query = query.lte('sale_date', `${filter.endDate}T23:59:59`);
    }
    if (filter?.customerId) {
      query = query.eq('customer_id', filter.customerId);
    }
    if (filter?.paymentStatus && filter.paymentStatus !== 'All') {
      query = query.eq('payment_status', filter.paymentStatus);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Sale[];
  },

  async getSaleById(id: string) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(*), items:sale_items(*, product:products(*), inventory_item:inventory_items(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Sale;
  },

  async processCheckout(input: CheckoutInput) {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const remainingAmount = Math.max(0, input.total_amount - input.paid_amount);
    const paymentStatus = remainingAmount === 0 ? 'Paid' : (input.paid_amount > 0 ? 'Partially Paid' : 'Pending');

    // 1. Calculate total historical purchase cost for exact profit
    let totalCost = 0;
    for (const item of input.items) {
      const itemUnitCost = item.selectedImei ? Number(item.selectedImei.purchase_price) : Number(item.unit_cost);
      totalCost += itemUnitCost * item.quantity;
    }
    const profit = Math.max(0, input.total_amount - totalCost);

    // 2. Insert Sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: input.customer_id || null,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        subtotal: input.subtotal,
        discount_amount: input.discount_amount,
        tax_amount: input.tax_amount,
        total_amount: input.total_amount,
        paid_amount: input.paid_amount,
        remaining_amount: remainingAmount,
        total_cost: totalCost,
        profit: profit,
        payment_method: input.payment_method,
        payment_details: input.payment_details || null,
        payment_status: paymentStatus,
        payment_terms: input.payment_terms,
        payment_due_date: input.payment_due_date || null,
        status: 'completed',
        notes: input.notes,
        sale_date: new Date().toISOString()
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 3. Process Sale Items and IMEI inventory state
    for (const item of input.items) {
      const itemUnitCost = item.selectedImei ? Number(item.selectedImei.purchase_price) : Number(item.unit_cost);
      const lineProfit = item.line_total - (itemUnitCost * item.quantity);

      const { data: sItem, error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          product_id: item.product.id,
          inventory_item_id: item.selectedImei ? item.selectedImei.id : null,
          imei_1: item.selectedImei ? item.selectedImei.imei_1 : null,
          imei_2: item.selectedImei ? item.selectedImei.imei_2 : null,
          serial_number: item.selectedImei ? item.selectedImei.serial_number : null,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: itemUnitCost,
          discount_amount: item.discount,
          line_total: item.line_total,
          profit: lineProfit
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // If IMEI tracked item, mark exact IMEI as 'sold'
      if (item.selectedImei) {
        const { error: imeiUpdateError } = await supabase
          .from('inventory_items')
          .update({
            status: 'sold',
            sold_sale_id: sale.id,
            sold_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.selectedImei.id);

        if (imeiUpdateError) throw imeiUpdateError;
        // Trigger automatically decrements products.quantity

        // Audit log
        await supabase
          .from('stock_transactions')
          .insert({
            product_id: item.product.id,
            inventory_item_id: item.selectedImei.id,
            transaction_type: 'sale',
            quantity_change: -1,
            previous_quantity: item.product.quantity,
            new_quantity: Math.max(0, item.product.quantity - 1),
            unit_cost: itemUnitCost,
            reference_type: 'sale',
            reference_id: sale.id,
            reason: `Sold in Invoice ${invoiceNumber} (IMEI: ${item.selectedImei.imei_1})`
          });
      } else {
        // Non-IMEI accessory/cable: decrement product quantity directly
        const prevQty = item.product.quantity;
        const newQty = Math.max(0, prevQty - item.quantity);
        await supabase
          .from('products')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', item.product.id);

        // Audit log
        await supabase
          .from('stock_transactions')
          .insert({
            product_id: item.product.id,
            transaction_type: 'sale',
            quantity_change: -item.quantity,
            previous_quantity: prevQty,
            new_quantity: newQty,
            unit_cost: itemUnitCost,
            reference_type: 'sale',
            reference_id: sale.id,
            reason: `Sold in Invoice ${invoiceNumber}`
          });
      }
    }

    // 4. Update Customer Ledger if registered customer
    if (input.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', input.customer_id)
        .single();

      if (customer) {
        const updatedPurchases = Number(customer.total_purchases) + Number(input.total_amount);
        const updatedPaid = Number(customer.total_paid) + Number(input.paid_amount);
        const updatedUdhar = Number(customer.current_udhar) + remainingAmount;

        await supabase
          .from('customers')
          .update({
            total_purchases: updatedPurchases,
            total_paid: updatedPaid,
            current_udhar: updatedUdhar,
            updated_at: new Date().toISOString()
          })
          .eq('id', input.customer_id);

        // If upfront payment was made for a credit sale, log installment record
        if (input.paid_amount > 0 && remainingAmount > 0) {
          await supabase
            .from('customer_payments')
            .insert({
              receipt_number: `CR-${Date.now().toString().slice(-6)}`,
              customer_id: input.customer_id,
              sale_id: sale.id,
              amount: input.paid_amount,
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: input.payment_method,
              reference_note: `Down payment for ${invoiceNumber}`,
              remaining_udhar: updatedUdhar
            });
        }
      }
    }

    return sale as Sale;
  }
};
