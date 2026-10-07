import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Cafe Corner',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Razorpay Order Creation Route
 * Securely calls Razorpay API using RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from process.env
 */
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // If Razorpay live/test credentials are provided in environment
    if (keyId && keySecret) {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency,
          receipt: receipt || `receipt_${Date.now()}`,
          payment_capture: 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Razorpay API error response:', errorText);
        return res.status(response.status).json({ error: 'Failed to create Razorpay order', details: errorText });
      }

      const orderData = await response.json();
      return res.json({
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
        isSimulated: false,
      });
    }

    // Safely generate order structure for frontend testing without requiring secrets
    const simulatedOrderId = `order_cc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return res.json({
      id: simulatedOrderId,
      amount,
      currency,
      keyId: keyId || 'rzp_test_placeholder',
      isSimulated: true,
      message: 'Razorpay order prepared for checkout',
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Internal server error creating order', message: error?.message });
  }
});

/**
 * Razorpay Payment Signature Verification Route
 * Verifies HMAC SHA256 signature server-side so secrets are never exposed to browser
 */
app.post('/api/razorpay/verify-payment', (req, res) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ verified: false, error: 'Missing order ID, payment ID, or signature' });
    }

    // If key secret is configured, perform cryptographic verification
    if (keySecret) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature.toLowerCase() === razorpay_signature.toLowerCase()) {
        return res.json({
          verified: true,
          order_id: order_id || '',
          payment_status: 'paid',
          message: 'Signature verified successfully',
        });
      } else {
        return res.status(400).json({
          verified: false,
          order_id: order_id || '',
          payment_status: 'pending',
          error: 'Invalid signature verification failed',
        });
      }
    }

    return res.status(500).json({
      verified: false,
      error: 'RAZORPAY_KEY_SECRET is not configured on server',
    });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ verified: false, error: 'Internal server error verifying signature' });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cafe Corner server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
