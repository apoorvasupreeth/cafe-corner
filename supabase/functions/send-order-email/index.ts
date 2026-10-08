// Supabase Edge Function: send-order-email
// Triggered to notify Cafe Corner administration of new customer orders
// Uses Resend API securely server-side without exposing any credentials to the frontend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Target admin notification recipient as specified
const ADMIN_NOTIFICATION_EMAIL = 'apoorvasupreeth24@gmail.com';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const order_id = body.order_id || body.orderId;

    if (!order_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing order_id in request body. An order ID is required to fetch and send details.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Read Resend API Key from Edge Function secrets
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY secret is not configured in Supabase Edge Secrets');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service configuration error: RESEND_API_KEY secret missing in Supabase Edge Functions',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Read Supabase configuration from Edge Function secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_KEY') ||
      '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database connection configuration error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in Edge Function environment',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Initialize Supabase server-side client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch the order from the existing 'orders' table
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderFetchError || !order) {
      console.error('Order not found in database:', order_id, orderFetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Order with ID ${order_id} not found in database`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Fetch related records from the existing 'order_items' table
    const { data: orderItems, error: itemsFetchError } = await supabase
      .from('order_items')
      .select('id, menu_item_id, item_name, quantity, unit_price, total_price, toppings')
      .eq('order_id', order_id);

    if (itemsFetchError) {
      console.warn('Could not fetch items for order:', order_id, itemsFetchError);
    }

    const items = orderItems || [];

    // Format currency in Indian Rupees
    const formatINR = (val: number | null | undefined) => {
      const num = typeof val === 'number' ? val : 0;
      return `₹${num.toFixed(2)}`;
    };

    // Format date/time
    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Determine sender address:
    // Supports verified custom domain configured via RESEND_FROM_EMAIL (e.g. orders@cafecorner.com or notifications@yourdomain.com)
    // Defaults safely to Resend's onboarded testing sender 'Cafe Corner <onboarding@resend.dev>'
    const fromSender = Deno.env.get('RESEND_FROM_EMAIL') || 'Cafe Corner <onboarding@resend.dev>';

    // Build items table for HTML email
    const itemsTableRows = items
      .map((item) => {
        const itemTotal = typeof item.total_price === 'number'
          ? item.total_price
          : (item.quantity || 1) * (item.unit_price || 0);

        return `
          <tr style="border-bottom: 1px solid #e7e5e4;">
            <td style="padding: 12px 8px; font-size: 14px; color: #292524; font-weight: 500;">
              ${escapeHtml(item.item_name || 'Menu Item')}
            </td>
            <td style="padding: 12px 8px; font-size: 14px; color: #57534e; text-align: center;">
              ${item.quantity || 1}
            </td>
            <td style="padding: 12px 8px; font-size: 14px; color: #57534e; text-align: right;">
              ${formatINR(item.unit_price)}
            </td>
            <td style="padding: 12px 8px; font-size: 14px; color: #1c1917; text-align: right; font-weight: 600;">
              ${formatINR(itemTotal)}
            </td>
          </tr>
        `;
      })
      .join('');

    // Plain text version of ordered items
    const itemsTextList = items
      .map((item, idx) => {
        const itemTotal = typeof item.total_price === 'number'
          ? item.total_price
          : (item.quantity || 1) * (item.unit_price || 0);
        return `${idx + 1}. ${item.item_name || 'Menu Item'} | Qty: ${item.quantity || 1} | Unit Price: ${formatINR(item.unit_price)} | Total: ${formatINR(itemTotal)}`;
      })
      .join('\n');

    // Build HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Order Alert - Cafe Corner</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #292524;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #451a03; padding: 24px 32px; text-align: left;">
              <h1 style="margin: 0; color: #fef3c7; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Cafe Corner</h1>
              <p style="margin: 4px 0 0 0; color: #fde68a; font-size: 13px;">New Order Notification &amp; Receipt</p>
            </td>
          </tr>

          <!-- Order Summary Header -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; border-bottom: 1px solid #f5f5f4;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #78716c; letter-spacing: 0.5px;">Order ID</span>
                    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #1c1917; font-family: monospace;">${escapeHtml(order.id)}</p>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #78716c; letter-spacing: 0.5px;">Date &amp; Time</span>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #44403c;">${escapeHtml(orderDate)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer & Status Details -->
          <tr>
            <td style="padding: 20px 32px; background-color: #fffbeb; border-bottom: 1px solid #fef3c7;">
              <table role="presentation" width="100%">
                <tr>
                  <td valign="top" style="width: 50%; padding-right: 12px;">
                    <strong style="font-size: 12px; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 4px;">Customer Information</strong>
                    <div style="font-size: 14px; color: #1c1917; font-weight: 600;">${escapeHtml(order.customer_name || 'Customer')}</div>
                    <div style="font-size: 13px; color: #44403c; margin-top: 2px;">📞 ${escapeHtml(order.customer_phone || 'N/A')}</div>
                  </td>
                  <td valign="top" style="width: 50%; padding-left: 12px;">
                    <strong style="font-size: 12px; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 4px;">Status &amp; Payment</strong>
                    <div style="font-size: 13px; color: #44403c;">Order Status: <span style="font-weight: 600; text-transform: capitalize;">${escapeHtml(order.order_status || 'placed')}</span></div>
                    <div style="font-size: 13px; color: #44403c; margin-top: 2px;">Payment Status: <span style="font-weight: 600; text-transform: capitalize; color: ${order.payment_status === 'paid' ? '#15803d' : '#b45309'};">${escapeHtml(order.payment_status || 'pending')}</span></div>
                    ${order.razorpay_payment_id ? `<div style="font-size: 12px; color: #78716c; font-family: monospace; margin-top: 2px;">Razorpay ID: ${escapeHtml(order.razorpay_payment_id)}</div>` : ''}
                  </td>
                </tr>
                ${order.delivery_address ? `
                <tr>
                  <td colspan="2" style="padding-top: 14px;">
                    <strong style="font-size: 12px; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 4px;">Delivery Address</strong>
                    <div style="font-size: 13px; color: #292524; background-color: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #fde68a;">
                      📍 ${escapeHtml(order.delivery_address)}
                    </div>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Ordered Items Table -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; color: #78716c; letter-spacing: 0.5px;">Ordered Items</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e7e5e4; text-align: left;">
                    <th style="padding: 8px; font-size: 12px; color: #78716c; font-weight: 600; text-transform: uppercase;">Item</th>
                    <th style="padding: 8px; font-size: 12px; color: #78716c; font-weight: 600; text-transform: uppercase; text-align: center;">Qty</th>
                    <th style="padding: 8px; font-size: 12px; color: #78716c; font-weight: 600; text-transform: uppercase; text-align: right;">Unit Price</th>
                    <th style="padding: 8px; font-size: 12px; color: #78716c; font-weight: 600; text-transform: uppercase; text-align: right;">Item Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsTableRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <table role="presentation" width="100%" style="background-color: #fafaf9; border-radius: 8px; padding: 16px; border: 1px solid #f5f5f4;">
                <tr>
                  <td style="font-size: 13px; color: #57534e; padding-bottom: 6px;">Subtotal</td>
                  <td align="right" style="font-size: 13px; color: #292524; font-weight: 500; padding-bottom: 6px;">${formatINR(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #57534e; padding-bottom: 8px;">Delivery Fee</td>
                  <td align="right" style="font-size: 13px; color: #292524; font-weight: 500; padding-bottom: 8px;">${formatINR(order.delivery_fee)}</td>
                </tr>
                <tr style="border-top: 1px solid #e7e5e4;">
                  <td style="font-size: 16px; font-weight: 700; color: #1c1917; padding-top: 10px;">Total Amount</td>
                  <td align="right" style="font-size: 18px; font-weight: 700; color: #92400e; padding-top: 10px;">${formatINR(order.total_amount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f4; padding: 16px 32px; text-align: center; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0; font-size: 12px; color: #78716c;">
                Cafe Corner Order Dispatch System • Automated notification for management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Plain text email fallback
    const emailText = `
CAFE CORNER - NEW ORDER NOTIFICATION
=========================================
Order ID: ${order.id}
Order Date/Time: ${orderDate}

CUSTOMER DETAILS:
- Name: ${order.customer_name || 'N/A'}
- Phone: ${order.customer_phone || 'N/A'}
- Delivery Address: ${order.delivery_address || 'N/A'}

ORDER STATUS & PAYMENT:
- Order Status: ${order.order_status || 'placed'}
- Payment Status: ${order.payment_status || 'pending'}
${order.razorpay_payment_id ? `- Razorpay Payment ID: ${order.razorpay_payment_id}` : ''}

ORDERED ITEMS:
${itemsTextList || 'No item details recorded'}

FINANCIAL BREAKDOWN:
- Subtotal: ${formatINR(order.subtotal)}
- Delivery Fee: ${formatINR(order.delivery_fee)}
- Total Amount: ${formatINR(order.total_amount)}
=========================================
Sent to Cafe Corner Admin: ${ADMIN_NOTIFICATION_EMAIL}
    `.trim();

    // 6. Send email via Resend REST API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromSender,
        to: [ADMIN_NOTIFICATION_EMAIL],
        subject: `[Cafe Corner] New Order #${order.id.slice(0, 8)} - ${order.customer_name || 'Customer'} (${formatINR(order.total_amount)})`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendResult = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResponse.status, resendResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: resendResult.message || 'Failed to dispatch email through Resend API',
          resendStatus: resendResponse.status,
          details: resendResult,
        }),
        {
          status: resendResponse.status >= 400 && resendResponse.status < 600 ? resendResponse.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Return clear JSON success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order email dispatched successfully to admin',
        order_id: order.id,
        recipient: ADMIN_NOTIFICATION_EMAIL,
        resend_email_id: resendResult.id || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Unhandled Edge Function error in send-order-email:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Internal server error in send-order-email function',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Basic HTML escaping helper to prevent injection in generated email templates
 */
function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
