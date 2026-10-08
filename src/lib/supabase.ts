import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Category, MenuItem, Topping, Profile, Order, OrderItem } from '../types/database';

function getStored(key: string): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(key) || '').trim();
}

function normalizeUrl(url: string): string {
  let cleaned = (url || '').trim();
  if (!cleaned) return '';
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

const envUrl = normalizeUrl(import.meta.env.VITE_SUPABASE_URL || '');
const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const storedUrl = normalizeUrl(getStored('cafe_corner_supabase_url'));
const storedKey = getStored('cafe_corner_supabase_key');

export let supabaseUrl = envUrl || storedUrl;
export let supabaseAnonKey = envAnonKey || storedKey;

export function checkIsConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
  );
}

export let isSupabaseConfigured = checkIsConfigured();

function createSupabaseInstance(): SupabaseClient | null {
  if (!checkIsConfigured()) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export let supabase: SupabaseClient | null = createSupabaseInstance();

/**
 * Update Supabase configuration dynamically at runtime
 */
export function configureSupabase(url: string, anonKey: string): boolean {
  const normUrl = normalizeUrl(url);
  const cleanKey = (anonKey || '').trim();

  if (!normUrl || !cleanKey) return false;

  supabaseUrl = normUrl;
  supabaseAnonKey = cleanKey;

  if (typeof window !== 'undefined') {
    localStorage.setItem('cafe_corner_supabase_url', normUrl);
    localStorage.setItem('cafe_corner_supabase_key', cleanKey);
  }

  isSupabaseConfigured = checkIsConfigured();
  supabase = createSupabaseInstance();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-updated', {
      detail: { isConfigured: isSupabaseConfigured }
    }));
  }

  return isSupabaseConfigured;
}

/**
 * Fetch all categories from the live Supabase categories table
 */
export async function getCategories(): Promise<Category[]> {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) {
    console.error('Error fetching categories from Supabase:', error);
    throw error;
  }

  return (data || []).sort((a: Category, b: Category) => {
    if (a.display_order !== undefined && b.display_order !== undefined && a.display_order !== null && b.display_order !== null) {
      return a.display_order - b.display_order;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Fetch all menu items from the live Supabase menu_items table
 */
export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  let query = supabase
    .from('menu_items')
    .select('*, categories(*)');

  if (categoryId && categoryId !== 'all') {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching menu items from Supabase:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch available toppings from the live Supabase toppings table
 */
export async function getToppings(): Promise<Topping[]> {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('toppings')
    .select('*');

  if (error) {
    console.error('Error fetching toppings from Supabase:', error);
    throw error;
  }

  return (data || []).filter((t: Topping) => {
    const isAvail = t.is_available ?? t.available;
    return isAvail === undefined || isAvail === null || isAvail === true;
  });
}

/**
 * Fetch customer profile from the live Supabase profiles table
 * Live profiles table columns: id, full_name, phone, address, created_at, updated_at
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile from Supabase:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    role: data.role || null,
    name: data.full_name || data.name || '',
    full_name: data.full_name || data.name || '',
    address: data.address || data.delivery_address || '',
    delivery_address: data.address || data.delivery_address || '',
  };
}

/**
 * Update or upsert customer profile in the live Supabase profiles table
 * Maps name -> full_name and delivery_address -> address to match Postgres schema strictly
 */
export async function updateProfile(userId: string, profileData: Partial<Profile>): Promise<Profile | null> {
  if (!supabase) throw new Error('Supabase client is not configured');

  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  const nameVal = profileData.full_name ?? profileData.name;
  if (nameVal !== undefined) {
    payload.full_name = nameVal;
  }

  if (profileData.phone !== undefined) {
    payload.phone = profileData.phone;
  }

  const addressVal = profileData.address ?? profileData.delivery_address;
  if (addressVal !== undefined) {
    payload.address = addressVal;
  }

  if (profileData.role !== undefined) {
    payload.role = profileData.role;
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile in Supabase:', error);
    throw error;
  }

  return {
    ...data,
    role: data.role || null,
    name: data.full_name || data.name || '',
    full_name: data.full_name || data.name || '',
    address: data.address || data.delivery_address || '',
    delivery_address: data.address || data.delivery_address || '',
  };
}

/**
 * Fetch orders for the authenticated customer directly from live Supabase orders table
 * Strictly filters by user_id
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  if (!supabase) throw new Error('Supabase client is not configured');

  // Query live orders table
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer orders from Supabase:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch single order by ID directly from live Supabase orders table
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  if (!supabase) throw new Error('Supabase client is not configured');

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(*))')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order by ID from Supabase:', error);
    throw error;
  }

  return data;
}

/**
 * Place Order directly into live Supabase orders and order_items tables
 * Fails fast and throws real Supabase error if RLS rejects or query fails
 */
export async function placeOrder(params: {
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: Order['payment_status'];
  orderStatus: Order['order_status'];
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  items: Array<{
    menuItemId: string;
    itemName?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    toppings?: any;
  }>;
}): Promise<Order> {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Please connect Supabase to place orders.');
  }

  // 1. Verify current active Supabase session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || !session.user) {
    throw new Error(
      'Authentication session required. You must be signed in with a valid Supabase account to place an order.'
    );
  }

  const authenticatedUserId = session.user.id;

  // 2. Insert into live Supabase 'orders' table
  const orderPayload: Record<string, unknown> = {
    user_id: authenticatedUserId,
    customer_name: params.customerName,
    customer_phone: params.customerPhone,
    delivery_address: params.deliveryAddress,
    subtotal: params.subtotal,
    delivery_fee: params.deliveryFee,
    total_amount: params.totalAmount,
    payment_status: params.paymentStatus,
    order_status: params.orderStatus,
    razorpay_order_id: params.razorpayOrderId || null,
    razorpay_payment_id: params.razorpayPaymentId || null,
    razorpay_signature: params.razorpaySignature || null,
    created_at: new Date().toISOString(),
  };

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([orderPayload])
    .select()
    .single();

  if (orderError) {
    console.error('SUPABASE ORDER INSERT FAILED:', orderError);
    // Explicitly throw real error with full details (code, message, details)
    const err = new Error(
      `Supabase orders INSERT failed: [${orderError.code || 'UNKNOWN'}] ${orderError.message} - ${orderError.details || ''}`
    );
    (err as any).supabaseError = orderError;
    throw err;
  }

  const createdOrder = orderData as Order;

  // 3. Insert into live Supabase 'order_items' table
  // Matching live Supabase order_items schema: order_id, menu_item_id, item_name, quantity, unit_price, total_price
  const orderItemsPayload = params.items.map((item) => ({
    order_id: createdOrder.id,
    menu_item_id: item.menuItemId,
    item_name: item.itemName || 'Menu Item',
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.subtotal,
  }));

  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload)
    .select();

  if (itemsError) {
    console.error('SUPABASE ORDER_ITEMS INSERT FAILED:', itemsError);
    const err = new Error(
      `Order #${createdOrder.id} was created, but inserting into order_items failed: [${itemsError.code || 'UNKNOWN'}] ${itemsError.message} - ${itemsError.details || ''}`
    );
    (err as any).supabaseError = itemsError;
    (err as any).orderId = createdOrder.id;
    throw err;
  }

  createdOrder.order_items = itemsData || [];

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('order-placed', { detail: { order: createdOrder } })
    );
  }

  return createdOrder;
}

/**
 * Update order payment status and Razorpay transaction details in Supabase
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: Order['payment_status'],
  razorpayDetails?: {
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    razorpaySignature?: string | null;
  }
): Promise<Order | null> {
  if (!supabase) throw new Error('Supabase client is not configured');

  const payload: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (razorpayDetails?.razorpayOrderId) payload.razorpay_order_id = razorpayDetails.razorpayOrderId;
  if (razorpayDetails?.razorpayPaymentId) payload.razorpay_payment_id = razorpayDetails.razorpayPaymentId;
  if (razorpayDetails?.razorpaySignature) payload.razorpay_signature = razorpayDetails.razorpaySignature;

  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating order payment status in Supabase:', error);
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('order-placed', { detail: { order: data } })
    );
  }

  return data;
}

/**
 * Fetch all orders with item details for admin dashboard via live Supabase
 * Uses existing RLS policies where role = 'admin' has full read access
 */
export async function getAllOrdersForAdmin(): Promise<Order[]> {
  if (!supabase) throw new Error('Supabase client is not configured');

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(*))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin orders from Supabase:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update order status by authorized admin in Supabase
 */
export async function updateOrderStatusByAdmin(
  orderId: string,
  newStatus: Order['order_status']
): Promise<Order | null> {
  if (!supabase) throw new Error('Supabase client is not configured');

  const { data, error } = await supabase
    .from('orders')
    .update({
      order_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*, order_items(*, menu_items(*))')
    .single();

  if (error) {
    console.error('Error updating order status in Supabase:', error);
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('order-status-updated', { detail: { order: data } })
    );
  }

  return data;
}

