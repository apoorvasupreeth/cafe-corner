/**
 * Razorpay Integration Service for Cafe Corner
 *
 * Security Requirements Strictly Enforced:
 * - RAZORPAY_KEY_SECRET is NEVER requested, stored, or exposed on the client side
 * - Only the public Razorpay Key ID (Test/Live) is used on the frontend
 * - Order creation and payment signature verification are strictly executed server-side
 *   via the Supabase Edge Functions:
 *     1. 'create_payment' (or 'create_order')
 *     2. 'verify-razorpay-payment'
 */

import { supabase } from '../lib/supabase';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export interface RazorpayOrderResponse {
  id: string; // razorpay_order_id
  amount: number;
  currency: string;
  keyId?: string;
  isSimulated?: boolean;
}

export interface RazorpayPaymentSuccessResult {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerificationResponse {
  verified: boolean;
  order_id?: string;
  payment_status?: string;
  error?: string;
  message?: string;
}

/**
 * Dynamically load the official Razorpay Checkout SDK
 */
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    // Check if script is already injected in document
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      if (window.Razorpay) return resolve(true);
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      // Timeout fallback if event was already fired
      setTimeout(() => {
        resolve(Boolean(window.Razorpay));
      }, 2000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout SDK script');
      resolve(false);
    };
    document.head.appendChild(script);

    // Timeout safety
    setTimeout(() => {
      if (window.Razorpay) resolve(true);
    }, 4000);
  });
}

/**
 * Call Supabase Edge Function 'create_payment' or 'create-razorpay-order' with the existing Cafe Corner order_id
 * Returns: { razorpay_order_id, amount, currency, key_id }
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  orderId: string
): Promise<RazorpayOrderResponse> {
  const amountInPaise = Math.round(amountInRupees * 100);
  const fallbackKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TkzhABU3U0BoGy';

  // 1. Primary Edge Function Call: 'create_payment'
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('create_payment', {
        body: {
          order_id: orderId,
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
        },
      });

      if (!error && data) {
        const razorpayOrderId = data.razorpay_order_id || data.id;
        if (razorpayOrderId && typeof razorpayOrderId === 'string' && !razorpayOrderId.startsWith('order_cc_')) {
          return {
            id: razorpayOrderId,
            amount: data.amount || amountInPaise,
            currency: data.currency || 'INR',
            keyId: data.key_id || data.keyId || fallbackKeyId,
            isSimulated: false,
          };
        }
      }
      if (error) {
        console.warn('Edge Function create_payment notice:', error.message || error);
      }
    } catch (err) {
      console.warn('create_payment invoke failed, trying create-razorpay-order:', err);
    }

    // 2. Secondary Edge Function Call: 'create-razorpay-order'
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          order_id: orderId,
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
        },
      });

      if (!error && data) {
        const razorpayOrderId = data.razorpay_order_id || data.id;
        if (razorpayOrderId && typeof razorpayOrderId === 'string' && !razorpayOrderId.startsWith('order_cc_')) {
          return {
            id: razorpayOrderId,
            amount: data.amount || amountInPaise,
            currency: data.currency || 'INR',
            keyId: data.key_id || data.keyId || fallbackKeyId,
            isSimulated: false,
          };
        }
      }
    } catch {
      // Continue to next fallback
    }

    // 3. Tertiary Edge Function Call: 'create_order'
    try {
      const { data, error } = await supabase.functions.invoke('create_order', {
        body: {
          order_id: orderId,
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
        },
      });

      if (!error && data) {
        const razorpayOrderId = data.razorpay_order_id || data.id;
        if (razorpayOrderId && typeof razorpayOrderId === 'string' && !razorpayOrderId.startsWith('order_cc_')) {
          return {
            id: razorpayOrderId,
            amount: data.amount || amountInPaise,
            currency: data.currency || 'INR',
            keyId: data.key_id || data.keyId || fallbackKeyId,
            isSimulated: false,
          };
        }
      }
    } catch {
      // Continue to local server fallback
    }
  }

  // 4. Server proxy endpoint fallback
  try {
    const response = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        order_id: orderId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rzpId = data.razorpay_order_id || data.id;
      if (rzpId && typeof rzpId === 'string' && !rzpId.startsWith('order_cc_') && !data.isSimulated) {
        return {
          id: rzpId,
          amount: data.amount || amountInPaise,
          currency: data.currency || 'INR',
          keyId: data.key_id || data.keyId || fallbackKeyId,
          isSimulated: false,
        };
      }
    }
  } catch (err) {
    console.warn('Server API create-order route notice:', err);
  }

  // 5. Fallback placeholder order structure (Direct Checkout compatible)
  return {
    id: '',
    amount: amountInPaise,
    currency: 'INR',
    keyId: fallbackKeyId,
    isSimulated: true,
  };
}

/**
 * Securely verify payment signature server-side via Supabase Edge Function 'verify-razorpay-payment'
 */
export async function verifyRazorpayPayment(
  result: RazorpayPaymentSuccessResult
): Promise<RazorpayVerificationResponse> {
  const payload = {
    order_id: result.order_id,
    razorpay_order_id: result.razorpay_order_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature,
  };

  // 1. Primary: Supabase Edge Function 'verify-razorpay-payment'
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: payload,
      });

      if (!error && data && data.verified === true && data.payment_status === 'paid') {
        return {
          verified: true,
          order_id: data.order_id || result.order_id,
          payment_status: 'paid',
          message: data.message || 'Payment verified successfully',
        };
      }

      if (data && data.verified === false) {
        return {
          verified: false,
          order_id: data.order_id || result.order_id,
          payment_status: data.payment_status || 'pending',
          error: data.error || 'Payment signature verification failed',
        };
      }

      if (error) {
        console.warn('Supabase Edge Function verify-razorpay-payment notice:', error.message || error);
        // Supabase FunctionsHttpError may carry error message in context or error details
        const edgeErrorMsg = (error as any)?.message || 'Edge function payment verification failed';
        return {
          verified: false,
          order_id: result.order_id,
          payment_status: 'pending',
          error: edgeErrorMsg,
        };
      }
    } catch (edgeErr: any) {
      console.warn('Edge function invoke exception, trying server endpoint:', edgeErr);
    }
  }

  // 2. Secondary: Express server proxy endpoint (for local development)
  try {
    const response = await fetch('/api/razorpay/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data && data.verified === true && data.payment_status === 'paid') {
      return {
        verified: true,
        order_id: data.order_id || result.order_id,
        payment_status: 'paid',
        message: data.message,
      };
    } else {
      return {
        verified: false,
        order_id: result.order_id,
        payment_status: 'pending',
        error: data.error || 'Server signature verification returned invalid',
      };
    }
  } catch (err: any) {
    console.warn('Server API verify-payment route notice:', err);
  }

  // 3. If verification could not be validated cryptographically, reject with pending status
  return {
    verified: false,
    order_id: result.order_id,
    payment_status: 'pending',
    error: 'Payment verification could not be confirmed by the server. Please check your order status.',
  };
}
