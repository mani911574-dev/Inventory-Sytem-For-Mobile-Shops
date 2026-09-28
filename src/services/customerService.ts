import { supabase } from './supabaseClient';
import { Customer, CustomerPayment, PaymentMethod } from '../types';

export const customerService = {
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []) as Customer[];
  },

  async getCustomerById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async createCustomer(customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...customer,
        current_udhar: customer.current_udhar || 0,
        total_purchases: customer.total_purchases || 0,
        total_paid: customer.total_paid || 0
      })
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async updateCustomer(id: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async getCustomerPayments(customerId?: string) {
    let query = supabase
      .from('customer_payments')
      .select('*, customer:customers(*), sale:sales(*)');
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    const { data, error } = await query.order('payment_date', { ascending: false });
    if (error) throw error;
    return (data || []) as CustomerPayment[];
  },

  async recordCustomerPayment(params: {
    customer_id: string;
    sale_id?: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_note?: string;
  }) {
    const customer = await this.getCustomerById(params.customer_id);
    const newUdhar = Math.max(0, Number(customer.current_udhar) - Number(params.amount));
    const newTotalPaid = Number(customer.total_paid) + Number(params.amount);
    const receiptNumber = `CR-${Date.now().toString().slice(-6)}`;

    // 1. Record installment payment
    const { data: payment, error: pError } = await supabase
      .from('customer_payments')
      .insert({
        receipt_number: receiptNumber,
        customer_id: params.customer_id,
        sale_id: params.sale_id || null,
        amount: params.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: params.payment_method,
        reference_note: params.reference_note,
        remaining_udhar: newUdhar
      })
      .select()
      .single();
    if (pError) throw pError;

    // 2. Update customer ledger
    await supabase
      .from('customers')
      .update({
        current_udhar: newUdhar,
        total_paid: newTotalPaid,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.customer_id);

    // 3. If tied to a specific sale, update the sale payment details
    if (params.sale_id) {
      const { data: sale } = await supabase
        .from('sales')
        .select('*')
        .eq('id', params.sale_id)
        .single();
      if (sale) {
        const updatedPaid = Number(sale.paid_amount) + Number(params.amount);
        const updatedRemaining = Math.max(0, Number(sale.total_amount) - updatedPaid);
        const updatedStatus = updatedRemaining === 0 ? 'Paid' : 'Partially Paid';
        await supabase
          .from('sales')
          .update({
            paid_amount: updatedPaid,
            remaining_amount: updatedRemaining,
            payment_status: updatedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.sale_id);
      }
    }

    return payment as CustomerPayment;
  }
};
