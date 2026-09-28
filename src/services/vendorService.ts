import { supabase } from './supabaseClient';
import { Vendor, VendorPayment, PaymentMethod } from '../types';

export const vendorService = {
  async getVendors() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || []) as Vendor[];
  },

  async getVendorById(id: string) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Vendor;
  },

  async createVendor(vendor: Partial<Vendor>) {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        ...vendor,
        current_balance: vendor.opening_balance || 0
      })
      .select()
      .single();
    if (error) throw error;
    return data as Vendor;
  },

  async updateVendor(id: string, updates: Partial<Vendor>) {
    const { data, error } = await supabase
      .from('vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Vendor;
  },

  async deleteVendor(id: string) {
    const { error } = await supabase
      .from('vendors')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  async getVendorPayments(vendorId?: string) {
    let query = supabase
      .from('vendor_payments')
      .select('*, vendor:vendors(*), purchase:purchases(*)');
    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }
    const { data, error } = await query.order('payment_date', { ascending: false });
    if (error) throw error;
    return (data || []) as VendorPayment[];
  },

  async recordVendorPayment(params: {
    vendor_id: string;
    purchase_id?: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_note?: string;
  }) {
    const vendor = await this.getVendorById(params.vendor_id);
    const newBalance = Math.max(0, Number(vendor.current_balance) - Number(params.amount));
    const paymentNumber = `VP-${Date.now().toString().slice(-6)}`;

    // Insert payment record
    const { data: payment, error: pError } = await supabase
      .from('vendor_payments')
      .insert({
        payment_number: paymentNumber,
        vendor_id: params.vendor_id,
        purchase_id: params.purchase_id || null,
        amount: params.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: params.payment_method,
        reference_note: params.reference_note,
        remaining_balance: newBalance
      })
      .select()
      .single();
    if (pError) throw pError;

    // Update vendor balance
    await supabase
      .from('vendors')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', params.vendor_id);

    // If payment was against a purchase, update purchase paid & remaining amount
    if (params.purchase_id) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', params.purchase_id)
        .single();
      if (purchase) {
        const updatedPaid = Number(purchase.paid_amount) + Number(params.amount);
        const updatedRem = Math.max(0, Number(purchase.total_amount) - updatedPaid);
        const updatedStatus = updatedRem === 0 ? 'Paid' : 'Partially Paid';
        await supabase
          .from('purchases')
          .update({
            paid_amount: updatedPaid,
            remaining_amount: updatedRem,
            payment_status: updatedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.purchase_id);
      }
    }

    return payment as VendorPayment;
  }
};
