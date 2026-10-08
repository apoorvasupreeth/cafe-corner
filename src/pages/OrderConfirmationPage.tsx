import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Phone, ArrowRight, ShoppingBag, Loader2 } from 'lucide-react';
import { getOrderById, isSupabaseConfigured } from '../lib/supabase';
import type { Order } from '../types/database';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    getOrderById(orderId)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        console.warn('Could not load order by ID:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800 mx-auto" />
        <p className="text-sm text-stone-600">Retrieving order details from Supabase...</p>
      </div>
    );
  }

  const steps = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'preparing', label: 'In Kitchen' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const currentStatus = order?.order_status || 'placed';
  const currentStepIndex = steps.findIndex((s) => s.key === currentStatus);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 pb-24">
      {/* Success Badge & Headline */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <span className="text-xs font-semibold text-emerald-800 tracking-wider uppercase">
          Order Confirmed
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          Thank you for dining with Cafe Corner!
        </h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          We have received your order. Our baristas and kitchen team are preparing your fresh order now.
        </p>
      </div>

      {/* Order Status Stepper */}
      <div className="bg-white rounded-xl border border-stone-200/90 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <span className="text-xs text-stone-500">Order Reference</span>
            <p className="font-mono text-sm font-bold text-stone-900">#{order?.id || orderId}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-stone-500">Estimated Delivery</span>
            <p className="font-serif text-sm font-bold text-amber-900">25–35 Mins</p>
          </div>
        </div>

        {/* Status progress bar */}
        <div className="py-2">
          <div className="grid grid-cols-4 gap-2 text-center">
            {steps.map((st, i) => {
              const isPassed = i <= activeIndex;
              return (
                <div key={st.key} className="space-y-2">
                  <div
                    className={`h-2 rounded-full transition-colors ${
                      isPassed ? 'bg-amber-700' : 'bg-stone-200'
                    }`}
                  />
                  <span
                    className={`block text-[11px] leading-tight ${
                      isPassed ? 'font-bold text-stone-900' : 'text-stone-400'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order & Customer Summary Details */}
      {order && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer & Address */}
          <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              Customer & Delivery
            </h3>
            <div className="space-y-2.5 text-xs text-stone-600">
              <p className="font-semibold text-stone-900 text-sm">
                {order.customer_name}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>{order.customer_phone}</span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span>{order.delivery_address}</span>
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span>Payment Mode:</span>
                <span className="font-semibold uppercase text-stone-800">
                  {order.payment_status === 'paid'
                    ? 'Razorpay (Paid Online)'
                    : order.payment_status === 'failed'
                    ? 'Payment Failed'
                    : 'Payment Pending / Processing'}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              Receipt Breakdown
            </h3>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-medium tabular-nums text-stone-800">
                  ₹{order.subtotal}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-mono font-medium tabular-nums text-stone-800">
                  {order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                <span>Total Paid</span>
                <span className="font-mono text-base tabular-nums text-amber-900">
                  ₹{order.total_amount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/orders"
          className="w-full sm:w-auto px-6 py-3 bg-amber-800 hover:bg-amber-900 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <span>Track in My Orders</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/menu"
          className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Back to Cafe Menu</span>
        </Link>
      </div>
    </div>
  );
};
