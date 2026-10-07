// Supabase Edge Function: create-razorpay-order
// Follows Deno runtime standards for Supabase Edge Functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'INR', receipt, order_id } = await req.json();

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'Order amount in paise is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Razorpay credentials from Supabase Edge Function Secrets
    const keyId = Deno.env.get('RAZORPAY_KEY_ID') || Deno.env.get('VITE_RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return new Response(
        JSON.stringify({
          error: 'Razorpay credentials not configured in Supabase Edge Secrets',
          hint: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase Dashboard -> Edge Functions -> Secrets',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call official Razorpay Orders API
    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        receipt: receipt || order_id || `order_${Date.now()}`,
        payment_capture: 1,
      }),
    });

    if (!rzpResponse.ok) {
      const errorText = await rzpResponse.text();
      console.error('Razorpay API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create Razorpay order', details: errorText }),
        { status: rzpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpOrder = await rzpResponse.json();

    // Return only the public order information required by the frontend
    return new Response(
      JSON.stringify({
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error creating Razorpay order' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
