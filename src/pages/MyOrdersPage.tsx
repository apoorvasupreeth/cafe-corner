import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ShoppingBag, ArrowRight, CheckCircle2, RotateCw, AlertCircle, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserOrders, isSupabaseConfigured } from '../lib/supabase';
import type { Order } from '../types/database';

export const MyOrdersPage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getUserOrders(user.id);
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to load user orders:', err);
      setErrorMessage(err?.message || 'Could not load your orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleOrderPlaced = () => {
      fetchOrders();
    };

    window.addEventListener('order-placed', handleOrderPlaced);
    return () => {
      window.removeEventListener('order-placed', handleOrderPlaced);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          Sign in to view your orders
        </h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
          Access your past orders, reorder your favorite coffees and pastries, and track live kitchen preparations.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-amber-800 text-white font-medium text-xs rounded-md hover:bg-amber-900 transition-colors cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: Order['order_status']) => {
    switch (status) {
      case 'placed':
        return <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded text-xs font-semibold">Order Placed</span>;
      case 'confirmed':
        return <span className="bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded text-xs font-semibold">Confirmed</span>;
      case 'preparing':
        return <span className="bg-sky-100 text-sky-900 px-2.5 py-0.5 rounded text-xs font-semibold">In Kitchen</span>;
      case 'ready':
        return <span className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded text-xs font-semibold">Ready for Pickup</span>;
      case 'out_for_delivery':
        return <span className="bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded text-xs font-semibold">Out for Delivery</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded text-xs font-semibold">Delivered</span>;
      case 'cancelled':
        return <span className="bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded text-xs font-semibold">Cancelled</span>;
      default:
        return <span className="bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded text-xs font-semibold">{status}</span>;
    }
  };

  const getPaymentBadge = (status: Order['payment_status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide">
            Paid Online
          </span>
        );
      case 'pending':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide">
            Cash on Delivery
          </span>
        );
      case 'failed':
        return (
          <span className="bg-rose-50 text-rose-800 border border-rose-200/80 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide">
            Payment Failed
          </span>
        );
      default:
        return (
          <span className="bg-stone-50 text-stone-700 border border-stone-200 px-2 py-0.5 rounded text-[11px] font-semibold uppercase">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
            Order History
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mt-1">
            My Cafe Orders
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Track and review your previous orders for {user.email}
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-md transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchOrders}
            className="px-3 py-1 bg-amber-800 text-white rounded text-xs font-medium hover:bg-amber-900 transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 p-6 space-y-3 animate-pulse">
              <div className="h-5 bg-stone-100 rounded w-1/4" />
              <div className="h-4 bg-stone-100 rounded w-1/2" />
              <div className="h-8 bg-stone-100 rounded w-1/6" />
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((ord) => {
            const formattedDate = ord.created_at
              ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent Order';

            return (
              <div
                key={ord.id}
                className="bg-white rounded-xl border border-stone-200/90 p-6 shadow-xs space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <span className="font-mono text-xs text-stone-400">Order ID:</span>{' '}
                    <span className="font-mono text-xs font-bold text-stone-900">#{ord.id}</span>
                    <span className="text-xs text-stone-400 mx-2">·</span>
                    <span className="text-xs text-stone-500">{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(ord.order_status)}
                    {getPaymentBadge(ord.payment_status)}
                  </div>
                </div>

                {/* Items in this order */}
                {ord.order_items && ord.order_items.length > 0 && (
                  <div className="space-y-2 py-1">
                    <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Ordered Items:
                    </h4>
                    <div className="divide-y divide-stone-100 text-xs">
                      {ord.order_items.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-stone-900">
                              {item.quantity}x {item.item_name || item.menu_items?.name || 'Cafe Item'}
                            </span>
                            {item.toppings && (
                              <p className="text-[11px] text-amber-800">
                                Toppings: {typeof item.toppings === 'string' ? item.toppings : JSON.stringify(item.toppings)}
                              </p>
                            )}
                          </div>
                          <span className="font-mono tabular-nums text-stone-800">
                            ₹{item.total_price || item.subtotal || item.unit_price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Footer */}
                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
                  <div className="space-y-0.5">
                    <p className="text-stone-800 font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{ord.delivery_address}</span>
                    </p>
                    <p className="text-stone-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{ord.customer_phone}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-stone-500 block">Total Amount</span>
                    <span className="font-mono text-base font-bold text-amber-900 tabular-nums">
                      ₹{ord.total_amount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200 space-y-4">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-800">
            No orders placed yet
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You haven’t placed any orders with this account yet. Check out our menu and treat yourself!
          </p>
          <Link
            to="/menu"
            className="inline-block px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-md transition-colors"
          >
            Explore Menu
          </Link>
        </div>
      )}
    </div>
  );
};
