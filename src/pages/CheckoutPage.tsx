import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Banknote,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShoppingBag,
  MapPin,
  Phone,
  User as UserIcon,
  RotateCw,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { placeOrder, updateOrderPaymentStatus, isSupabaseConfigured } from '../lib/supabase';
import {
  loadRazorpayScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/razorpay';
import type { Order } from '../types/database';

export const CheckoutPage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, profile, updateCustomerProfile } = useAuth();
  const { items, subtotal, deliveryFee, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

  // Payment Execution & State Tracking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);

  // Pre-fill fields from user profile when available
  useEffect(() => {
    if (profile) {
      if (!customerName) {
        setCustomerName(profile.name || profile.full_name || '');
      }
      if (!customerPhone) {
        setCustomerPhone(profile.phone || '');
      }
      if (!deliveryAddress) {
        setDeliveryAddress(profile.delivery_address || profile.address || '');
      }
    }
  }, [profile]);

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Your bag is empty</h2>
        <p className="text-xs text-stone-500">
          Please add items to your bag before proceeding to checkout.
        </p>
        <Link
          to="/menu"
          className="inline-block px-6 py-2.5 bg-amber-800 text-white font-medium text-xs rounded-md hover:bg-amber-900 transition-colors"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  // Enforce authentication requirement per specifications
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-stone-900">Sign in to complete order</h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Cafe Corner orders require an authenticated account so you can track real-time kitchen preparation and delivery progress securely.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Sign In or Create Account
          </button>
          <Link
            to="/menu"
            className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-sm rounded-lg transition-colors"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckoutProcess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please provide your contact name, phone number, and complete delivery address.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Supabase is not configured yet. Please ensure your project environment variables are set.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Sync updated customer profile
      setSubmittingStep('Updating customer profile...');
      await updateCustomerProfile({
        name: customerName,
        phone: customerPhone,
        delivery_address: deliveryAddress,
      }).catch((err) => console.warn('Profile sync notice:', err));

      // 2. Prepare items payload for order_items table
      const orderItemsPayload = items.map((it) => ({
        menuItemId: it.menuItem.id,
        itemName: it.menuItem.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.totalPrice,
        toppings: it.selectedToppings,
      }));

      // 3. Step 4: Create order in Supabase orders table with payment_status='pending' and order_status='placed'
      // Prevent duplicate order creation if user is retrying payment for the same pending order
      let currentOrder: Order;
      if (pendingOrder) {
        currentOrder = pendingOrder;
      } else {
        setSubmittingStep('Creating order in database...');
        currentOrder = await placeOrder({
          userId: user.id,
          customerName,
          customerPhone,
          deliveryAddress,
          subtotal,
          deliveryFee,
          totalAmount,
          paymentStatus: 'pending',
          orderStatus: 'placed',
          items: orderItemsPayload,
        });
        setPendingOrder(currentOrder);
      }

      // 4. Handle Payment Flow
      if (paymentMethod === 'razorpay') {
        setSubmittingStep('Connecting to Razorpay Test Checkout...');
        
        // Load official Razorpay Checkout SDK
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded && !window.Razorpay) {
          throw new Error('Could not load Razorpay Checkout SDK. Please check your internet connection and retry.');
        }

        // Step 5 & 6: Call Supabase Edge Function 'create-razorpay-order'
        setSubmittingStep('Creating secure Razorpay order...');
        const rzpOrder = await createRazorpayOrder(totalAmount, currentOrder.id);

        if (window.Razorpay) {
          setSubmittingStep('Opening Razorpay Test Payment Modal...');

          // Step 7: Open Razorpay Checkout modal
          const razorpayKeyId = rzpOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TkzhABU3U0BoGy';

          const options: any = {
            key: razorpayKeyId,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency || 'INR',
            name: 'Cafe Corner',
            description: `Artisanal Order #${currentOrder.id.slice(0, 8)}`,
            prefill: {
              name: customerName,
              email: user.email || '',
              contact: customerPhone,
            },
            notes: {
              supabase_order_id: currentOrder.id,
              cafe_branch: 'Hiriyur',
            },
            theme: {
              color: '#854D0E',
            },
            handler: async (response: {
              razorpay_order_id?: string;
              razorpay_payment_id: string;
              razorpay_signature?: string;
            }) => {
              // Step 8 & 9: Server-side HMAC signature verification
              setIsSubmitting(true);
              setSubmittingStep('Verifying payment signature with server...');

              try {
                const verifyRes = await verifyRazorpayPayment({
                  order_id: currentOrder.id,
                  razorpay_order_id: response.razorpay_order_id || rzpOrder.id || `order_${response.razorpay_payment_id}`,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature || '',
                });

                // Step 10: Only after successful server-side verification and payment_status === 'paid', update order and show confirmation
                if (verifyRes.verified && verifyRes.payment_status === 'paid') {
                  setSubmittingStep('Payment verified! Confirming order...');
                  await updateOrderPaymentStatus(currentOrder.id, 'paid', {
                    razorpayOrderId: response.razorpay_order_id || rzpOrder.id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  });

                  clearCart();
                  navigate(`/order-confirmation/${currentOrder.id}`);
                } else {
                  // Step 11: Verification failed
                  console.error('Payment verification signature rejected');
                  await updateOrderPaymentStatus(currentOrder.id, 'failed').catch(() => {});
                  setErrorMessage(
                    verifyRes.error ||
                      'Payment signature verification failed. Your card has not been charged. Please retry.'
                  );
                  setIsSubmitting(false);
                  setSubmittingStep('');
                }
              } catch (verifyErr: any) {
                console.error('Payment verification error:', verifyErr);
                setErrorMessage(verifyErr.message || 'Payment verification encountered an issue. Please retry.');
                setIsSubmitting(false);
                setSubmittingStep('');
              }
            },
            modal: {
              ondismiss: () => {
                // Step 11: User cancelled payment modal
                setIsSubmitting(false);
                setSubmittingStep('');
                setErrorMessage(
                  'Payment window was closed. Your order is safely preserved as Pending. Click "Complete Payment" to retry.'
                );
              },
              escape: true,
              backdropclose: false,
            },
          };

          // Only attach order_id if it is a genuine Razorpay-created order ID
          if (rzpOrder.id && !rzpOrder.isSimulated && !rzpOrder.id.startsWith('order_cc_')) {
            options.order_id = rzpOrder.id;
          }

          try {
            const rzpInstance = new window.Razorpay(options);

            if (typeof rzpInstance.on === 'function') {
              rzpInstance.on('payment.failed', function (response: any) {
                const errorInfo = response?.error;
                const isCancellation =
                  errorInfo?.reason === 'payment_cancelled' ||
                  errorInfo?.step === 'payment_authentication' ||
                  errorInfo?.code === 'BAD_REQUEST_ERROR';

                console.warn('Razorpay payment flow notice:', errorInfo?.description || errorInfo?.reason || 'Payment cancelled');
                setIsSubmitting(false);
                setSubmittingStep('');

                if (isCancellation) {
                  setErrorMessage(
                    'Payment was cancelled or closed. Your order is safely saved as Pending. Click "Complete Payment" when you are ready to retry.'
                  );
                } else {
                  setErrorMessage(
                    `Payment was not completed: ${errorInfo?.description || errorInfo?.reason || 'Transaction declined'}. You can retry payment below.`
                  );
                }
              });
            }

            rzpInstance.open();
            return;
          } catch (rzpOpenErr: any) {
            console.warn('Notice opening Razorpay modal:', rzpOpenErr);
            setIsSubmitting(false);
            setSubmittingStep('');
            setErrorMessage(
              `Could not open Razorpay checkout: ${rzpOpenErr?.message || 'SDK initialization issue'}. Please retry.`
            );
            return;
          }
        } else {
          throw new Error('Razorpay Checkout SDK is not ready in this browser environment.');
        }
      } else {
        // Cash on Delivery Order placement
        setSubmittingStep('Confirming Pay on Delivery order...');
        clearCart();
        navigate(`/order-confirmation/${currentOrder.id}`);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      setErrorMessage(err?.message || 'Could not place order. Please verify your connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 pb-24">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
          Final Step
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mt-1">
          Checkout & Delivery
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Signed in as <strong className="text-stone-800">{user.email}</strong>
        </p>
      </div>

      {/* Error & Status Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
          {pendingOrder && (
            <button
              type="button"
              onClick={() => handleCheckoutProcess()}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>Retry Payment</span>
            </button>
          )}
        </div>
      )}

      {/* Pending Order Notice */}
      {pendingOrder && !errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              Order <strong>#{pendingOrder.id.slice(0, 8)}</strong> is created and awaiting payment verification.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCheckoutProcess()}
            disabled={isSubmitting}
            className="px-3 py-1 bg-amber-800 text-white rounded text-xs font-medium hover:bg-amber-900 transition-colors shrink-0 cursor-pointer"
          >
            Continue Payment
          </button>
        </div>
      )}

      <form onSubmit={handleCheckoutProcess}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Customer Details & Delivery (7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Details Card */}
            <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-4 shadow-xs">
              <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-800" />
                Delivery Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="E.g. Apoorva Sharma"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Complete Delivery Address *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Flat/House no., building name, street, landmark, PIN code"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Saved to your customer profile for faster one-click checkout next time.
                </p>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-4 shadow-xs">
              <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
                Select Payment Mode
              </h3>

              <div className="space-y-3">
                <label
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`flex items-start justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'razorpay'
                      ? 'border-amber-700 bg-amber-50/50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      className="mt-1 text-amber-800 focus:ring-amber-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">
                          Razorpay Test Mode Checkout
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        UPI, Google Pay, PhonePe, Cards & Net Banking with server-side HMAC verification.
                      </p>
                      
                      {/* Test Mode Simulation Tips */}
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200/90 rounded-lg text-xs text-amber-950 space-y-2.5">
                        <div className="font-bold flex items-center justify-between text-amber-950">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                            <span>Razorpay Test Mode Available Options:</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-200/70 text-amber-900 rounded">INR Domestic</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {/* Netbanking Method (Easiest) */}
                          <div className="bg-white/95 p-2.5 rounded border border-amber-200/70 shadow-2xs">
                            <span className="font-bold text-stone-800 block text-[10.5px] uppercase text-indigo-800">
                              🏦 1. Netbanking (Easiest):
                            </span>
                            <div className="text-[11px] text-stone-700 mt-1 space-y-0.5">
                              <div>• Select <strong>Netbanking</strong> in modal</div>
                              <div>• Choose <strong>HDFC</strong>, <strong>SBI</strong> or <strong>ICICI</strong></div>
                              <div>• Click the green <strong className="text-emerald-700">"Success"</strong> button</div>
                            </div>
                          </div>

                          {/* RuPay / Domestic Card */}
                          <div className="bg-white/95 p-2.5 rounded border border-amber-200/70 shadow-2xs">
                            <span className="font-bold text-stone-800 block text-[10.5px] uppercase text-emerald-800">
                              💳 2. RuPay Test Card:
                            </span>
                            <code className="font-mono font-bold text-stone-900 select-all text-xs tracking-wider block mt-1">
                              5085 0500 0000 0001
                            </code>
                            <div className="text-[10.5px] text-stone-600 mt-0.5">
                              Exp: <strong className="text-stone-800">12/28</strong> • CVV: <strong className="text-stone-800">123</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-[10.5px] text-amber-900/90 bg-amber-100/60 p-1.5 rounded border border-amber-200/50">
                          💡 <em>If UPI is not activated on your Razorpay Merchant account, use <strong>Netbanking</strong> or the <strong>RuPay Card</strong> above to complete test orders.</em>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CreditCard className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                </label>

                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-start justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-amber-700 bg-amber-50/50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 text-amber-800 focus:ring-amber-800"
                    />
                    <div>
                      <span className="text-sm font-bold text-stone-900">
                        Pay on Delivery (Cash / UPI at doorstep)
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Pay via cash or delivery agent QR scanner upon handover.
                      </p>
                    </div>
                  </div>
                  <Banknote className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-4 shadow-xs sticky top-24">
              <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
                Order Summary ({items.length} items)
              </h3>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 pr-1 text-xs space-y-2">
                {items.map((it) => (
                  <div key={it.cartItemId} className="pt-2 first:pt-0 flex justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 truncate">
                        {it.quantity}x {it.menuItem.name}
                      </p>
                      {it.selectedToppings?.length > 0 && (
                        <p className="text-[11px] text-amber-800">
                          + {it.selectedToppings.map((t) => t.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-stone-900 tabular-nums shrink-0">
                      ₹{it.totalPrice}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="pt-4 border-t border-stone-200 space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium tabular-nums text-stone-800">
                    ₹{subtotal}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivery Charges</span>
                  <span className="font-mono font-medium tabular-nums text-stone-800">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-semibold">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="pt-3 border-t border-stone-200 flex justify-between text-base font-bold text-stone-900">
                  <span>Total Amount</span>
                  <span className="font-mono text-lg tabular-nums text-amber-900">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{submittingStep || 'Processing Order...'}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {pendingOrder
                        ? `Complete Payment (₹${totalAmount})`
                        : paymentMethod === 'razorpay'
                        ? `Pay ₹${totalAmount} via Razorpay`
                        : `Place Order (₹${totalAmount})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>Protected by Supabase Row-Level Security</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
