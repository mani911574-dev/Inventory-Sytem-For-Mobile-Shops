export interface ShopSettings {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  currency_symbol: string;
  invoice_prefix: string;
  purchase_prefix: string;
  receipt_footer: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PaymentTerm = 'Immediate' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export interface Vendor {
  id: string;
  name: string;
  company_name?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  email?: string;
  opening_balance: number;
  current_balance: number;
  payment_terms: PaymentTerm;
  custom_term_days: number;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: string;
  product_code: string;
  name: string;
  brand: string;
  model?: string;
  category_id?: string;
  category?: Category;
  vendor_id?: string;
  vendor?: Vendor;
  is_imei_tracked: boolean;
  variant?: string;
  color?: string;
  storage?: string;
  ram?: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  min_stock_level: number;
  warranty_info?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ImeiStatus = 'available' | 'sold' | 'returned' | 'damaged' | 'reserved';

export interface InventoryItem {
  id: string;
  product_id: string;
  product?: Product;
  imei_1?: string;
  imei_2?: string;
  serial_number?: string;
  color?: string;
  storage?: string;
  ram?: string;
  purchase_price: number;
  sale_price: number;
  status: ImeiStatus;
  purchase_id?: string;
  purchase_item_id?: string;
  sold_sale_id?: string;
  sold_at?: string;
  warranty_expiry?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type PurchasePaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';

export interface Purchase {
  id: string;
  purchase_number: string;
  vendor_id: string;
  vendor?: Vendor;
  purchase_date: string;
  reference_invoice?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PurchasePaymentStatus;
  payment_due_date?: string;
  payment_method: string;
  notes?: string;
  created_by?: string;
  items?: PurchaseItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at?: string;
}

export type PaymentMethod = 'Cash' | 'Bank' | 'Easypaisa' | 'JazzCash' | 'Card' | 'Udhar' | 'Mixed' | 'Other';

export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  vendor?: Vendor;
  purchase_id?: string;
  purchase?: Purchase;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_note?: string;
  remaining_balance: number;
  created_by?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  is_walk_in: boolean;
  total_purchases: number;
  total_paid: number;
  current_udhar: number;
  created_at?: string;
  updated_at?: string;
}

export type SaleStatus = 'completed' | 'returned' | 'partially_returned' | 'cancelled';
export type SalePaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer?: Customer;
  customer_name: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  total_cost: number;
  profit: number;
  payment_method: PaymentMethod;
  payment_details?: Record<string, number>;
  payment_status: SalePaymentStatus;
  payment_terms: PaymentTerm;
  payment_due_date?: string;
  status: SaleStatus;
  notes?: string;
  cashier_id?: string;
  sale_date: string;
  items?: SaleItem[];
  created_at?: string;
  updated_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  inventory_item_id?: string;
  inventory_item?: InventoryItem;
  imei_1?: string;
  imei_2?: string;
  serial_number?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_amount: number;
  line_total: number;
  profit: number;
  is_returned: boolean;
  created_at?: string;
}

export interface CustomerPayment {
  id: string;
  receipt_number: string;
  customer_id: string;
  customer?: Customer;
  sale_id?: string;
  sale?: Sale;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_note?: string;
  remaining_udhar: number;
  created_by?: string;
  created_at?: string;
}

export interface Return {
  id: string;
  return_number: string;
  sale_id: string;
  sale?: Sale;
  customer_id?: string;
  customer?: Customer;
  refund_amount: number;
  refund_payment_method: PaymentMethod;
  reason?: string;
  created_by?: string;
  items?: ReturnItem[];
  created_at?: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string;
  product?: Product;
  inventory_item_id?: string;
  imei_1?: string;
  imei_2?: string;
  quantity: number;
  refund_unit_price: number;
  total_refund: number;
  created_at?: string;
}

export type TransactionType = 'purchase' | 'sale' | 'sale_return' | 'purchase_return' | 'manual_adjustment' | 'damaged' | 'lost';

export interface StockTransaction {
  id: string;
  product_id: string;
  product?: Product;
  inventory_item_id?: string;
  transaction_type: TransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  reason?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  selectedImei?: InventoryItem; // Specific phone unit chosen
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  line_total: number;
}
