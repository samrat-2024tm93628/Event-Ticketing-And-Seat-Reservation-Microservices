// adapter.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PAYMENT_URL = process.env.PAYMENT_URL || "http://localhost:5004/v1/payments/charge";
const SERVICE_JWT = process.env.SERVICE_JWT || "";
const RETRY_ATTEMPTS = Number(process.env.RETRY_ATTEMPTS || 2);
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 300);

if (!SERVICE_JWT) {
  console.warn("WARNING: SERVICE_JWT is not set. Adapter will forward requests without Authorization.");
}

app.get('/health', (req, res) => res.send('Payment Adapter is running'));

app.get('/debug/auth', (req, res) => {
  res.json({ sendingAuthorization: SERVICE_JWT ? `Bearer ${SERVICE_JWT.substring(0,8)}...` : null });
});

app.post('/adapter/payments/charge', async (req, res) => {
  const incomingIdempotency = req.headers['idempotency-key'] || req.body.idempotency_key;
  const payload = {
    order_id: req.body.order_id,
    amount: req.body.amount,
    method: req.body.method,
    idempotency_key: incomingIdempotency || `ADP-${Date.now()}`
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(incomingIdempotency ? { 'Idempotency-Key': incomingIdempotency } : {}),
    ...(SERVICE_JWT ? { 'Authorization': `Bearer ${SERVICE_JWT}` } : {})
  };

  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const resp = await axios.post(PAYMENT_URL, payload, { headers, timeout: 10000 });
      return res.status(resp.status).json(resp.data);
    } catch (err) {
      const isLast = attempt === RETRY_ATTEMPTS;
      const status = err.response ? err.response.status : null;

      if (!isLast && (!status || (status >= 500 && status < 600))) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      if (err.response) {
        return res.status(err.response.status).json(err.response.data);
      } else {
        return res.status(502).json({ error: 'Bad Gateway', detail: err.message });
      }
    }
  }
});

const port = Number(process.env.PORT || 6000);
app.listen(port, () => console.log(`Payment Adapter running on port ${port}`));
