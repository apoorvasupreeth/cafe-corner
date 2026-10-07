/**
 * Cafe Corner Database Types
 * Corresponds strictly to the existing Supabase database schema:
 * - categories
 * - menu_items
 * - toppings
 * - orders
 * - order_items
 * - profiles
 */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  display_order?: number | null;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  is_available?: boolean | null;
  available?: boolean | null;
  image_url?: string | null;
  created_at?: string;
  categories?: Category | null;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  is_available?: boolean | null;
  available?: boolean | null;
  created_at?: string;
}

export interface Profile {
  id: string;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  delivery_address?: string | null;
  address?: string | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  subtotal?: number;
  toppings?: string | Topping[] | Record<string, unknown> | null;
  created_at?: string;
  menu_items?: MenuItem | null;
}

export interface Order {
  id: string;
  user_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  notes?: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedToppings: Topping[];
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}
