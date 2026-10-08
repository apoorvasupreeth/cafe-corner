// Supabase Edge Function: verify-razorpay-payment
// Securely verifies Razorpay HMAC SHA256 payment signature server-side
// Updates the existing Cafe Corner orders table upon valid cryptographic verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Securely generate HMAC SHA-256 hex digest using Web Crypto API
 */
async function generateHmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

serve(async (req) => {
  // 10. Handle CORS preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // 1. Validate that required parameters are present
    if (!order_id || !razorpay_payment_id) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Missing required parameters. Required: order_id, razorpay_payment_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Read RAZORPAY_KEY_SECRET strictly from Edge Function environment
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET is not configured in Supabase Edge Secrets');
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Server payment configuration error: RAZORPAY_KEY_SECRET secret missing',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Initialize Supabase Service Role client to retrieve and update the order
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment');
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Database connection configuration error in Edge Function',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve the existing Cafe Corner order from the orders table
    const { data: existingOrder, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, payment_status, order_status, razorpay_order_id, razorpay_payment_id, total_amount')
      .eq('id', order_id)
      .single();

    if (orderFetchError || !existingOrder) {
      console.error('Order not found in database:', order_id, orderFetchError);
      return new Response(
        JSON.stringify({
          verified: false,
          error: `Order with ID ${order_id} not found`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Duplicate email prevention using existing database structure:
    // Check if the order was already verified and marked as 'paid' prior to this request
    const isAlreadyPaid = existingOrder.payment_status === 'paid';

    // 4. If existing order already had a razorpay_order_id recorded, verify it matches
    if (existingOrder.razorpay_order_id && existingOrder.razorpay_order_id !== razorpay_order_id) {
      console.error('Razorpay order ID mismatch:', {
        stored: existingOrder.razorpay_order_id,
        received: razorpay_order_id,
      });
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Razorpay order ID mismatch with stored order',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let isSignatureValid = false;

    // 5. Primary Verification: HMAC SHA-256 verification when genuine order_id and signature are present
    if (razorpay_order_id && razorpay_signature && !razorpay_order_id.startsWith('order_pay_')) {
      const payloadToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = await generateHmacSha256Hex(payloadToSign, keySecret);
      isSignatureValid = secureCompare(
        generatedSignature.toLowerCase(),
        razorpay_signature.toLowerCase()
      );
    }

    // 6. Direct Razorpay API verification fallback:
    // When payment was completed via direct checkout (Netbanking/UPI) without a pre-generated Razorpay order ID
    if (!isSignatureValid && razorpay_payment_id) {
      const keyId = Deno.env.get('RAZORPAY_KEY_ID') || Deno.env.get('VITE_RAZORPAY_KEY_ID') || 'rzp_test_TkzhABU3U0BoGy';
      try {
        const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);
        const rzpCheck = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
          headers: { Authorization: authHeader },
        });

        if (rzpCheck.ok) {
          const paymentData = await rzpCheck.json();
          if (paymentData.status === 'captured' || paymentData.status === 'authorized') {
            console.log(`Direct Razorpay payment ${razorpay_payment_id} verified as ${paymentData.status}`);
            isSignatureValid = true;
          }
        } else {
          console.warn(`Razorpay API check returned HTTP ${rzpCheck.status} for payment:`, razorpay_payment_id);
        }
      } catch (rzpErr) {
        console.error('Error contacting Razorpay API for direct payment verification:', rzpErr);
      }
    }

    // 7. If verification fails: do NOT mark the order as paid; return error
    if (!isSignatureValid) {
      console.warn('Razorpay signature or API payment verification failed for order:', order_id);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Payment verification failed: invalid signature or unconfirmed transaction',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 8. If verification succeeds: update the existing orders row
    // payment_status = 'paid'
    // razorpay_order_id = supplied order ID
    // razorpay_payment_id = supplied payment ID
    // razorpay_signature = supplied signature
    // Keep existing order_status unchanged.
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Failed to update order payment status in database:', updateError);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Payment verified, but failed to update order record in database',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 9. Automatically invoke send-order-email server-side after successful DB update
    // Only dispatch if this is the initial payment verification (prevents duplicate emails on retries)
    if (!isAlreadyPaid) {
      try {
        console.log(`Triggering send-order-email for newly paid order: ${order_id}`);
        const { data: emailData, error: emailError } = await supabase.functions.invoke(
          'send-order-email',
          {
            body: { order_id },
          }
        );

        if (emailError) {
          // Log clearly without affecting successful payment verification
          console.error(`send-order-email invocation returned error for order ${order_id}:`, emailError);
        } else {
          console.log(`send-order-email successfully dispatched for order ${order_id}:`, emailData);
        }
      } catch (emailInvocationError) {
        // Requirement 11: If email notification fails, DO NOT fail the payment or undo DB update.
        console.error(`Exception while invoking send-order-email for order ${order_id}:`, emailInvocationError);
      }
    } else {
      console.log(`Order ${order_id} was already marked as paid. Skipping send-order-email to avoid duplicate notification.`);
    }

    // 10. Return success response format (strictly preserves frontend compatibility)
    return new Response(
      JSON.stringify({
        verified: true,
        order_id: order_id,
        payment_status: 'paid',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Unhandled Edge Function error:', err);
    return new Response(
      JSON.stringify({
        verified: false,
        error: err?.message || 'Internal server error processing payment verification',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
