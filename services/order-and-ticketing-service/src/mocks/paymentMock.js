const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Mock payment data store
const payments = new Map();
const idempotencyCache = new Map();

// POST /charge - Process payment
app.post('/charge', (req, res) => {
  const { orderId, amount, method } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!orderId || !amount || !method) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header required' });
  }

  console.log(`[Payment Mock] Processing charge for order ${orderId}, amount: ${amount}, idempotency-key: ${idempotencyKey}`);

  // Check idempotency cache
  if (idempotencyCache.has(idempotencyKey)) {
    console.log(`[Payment Mock] Returning cached response for idempotency-key: ${idempotencyKey}`);
    return res.status(200).json(idempotencyCache.get(idempotencyKey));
  }

  // Simulate payment processing
  // Fail if amount is negative or zero
  if (amount <= 0) {
    const errorResponse = {
      success: false,
      error: 'Invalid amount',
      orderId
    };
    idempotencyCache.set(idempotencyKey, errorResponse);
    return res.status(400).json(errorResponse);
  }

  // Simulate occasional failures (10% chance)
  const shouldFail = Math.random() < 0.1;

  if (shouldFail) {
    const errorResponse = {
      success: false,
      error: 'Payment declined',
      orderId
    };
    idempotencyCache.set(idempotencyKey, errorResponse);
    return res.status(402).json(errorResponse);
  }

  // Process successful payment
  const paymentId = `PAY-${uuidv4()}`;
  const payment = {
    paymentId,
    orderId,
    amount,
    method,
    status: 'PAID',
    processedAt: new Date(),
    idempotencyKey
  };

  payments.set(paymentId, payment);

  const successResponse = {
    success: true,
    paymentId,
    orderId,
    amount,
    status: 'PAID',
    processedAt: payment.processedAt
  };

  idempotencyCache.set(idempotencyKey, successResponse);

  res.status(200).json(successResponse);
});

// POST /refund - Process refund
app.post('/refund', (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  console.log(`[Payment Mock] Processing refund for payment ${paymentId}`);

  const payment = payments.get(paymentId);

  if (!payment) {
    return res.status(404).json({
      error: 'Payment not found',
      paymentId
    });
  }

  const refundId = `REF-${uuidv4()}`;
  payment.status = 'REFUNDED';
  payment.refundId = refundId;
  payment.refundedAt = new Date();

  res.status(200).json({
    success: true,
    refundId,
    paymentId,
    amount: payment.amount,
    status: 'REFUNDED',
    refundedAt: payment.refundedAt
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payment-mock' });
});

app.listen(PORT, () => {
  console.log(`Payment Mock Service listening on port ${PORT}`);
});

