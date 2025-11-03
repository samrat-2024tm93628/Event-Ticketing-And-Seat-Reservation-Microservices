/**
 * Mock services for seat reservation service
 * This file sets up mock services for Catalog, Payment and Order
 * using Node.js and Express.js
 * @module mock_services/mock_server
 * @summary Mock services for seat reservation service
 * @example node mock_services/mock_server.js
 */
const fs = require('fs');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Mock Catalog: return ON_SALE by default
app.get('/v1/events/:eventId', (req, res) => {
  const { eventId } = req.params;
  return res.json({ eventId, status: 'ON_SALE', name: `Mock Event ${eventId}` });
});

// Mock Payment: accept and return success
app.post('/v1/payments/simulate', (req, res) => {
  const { orderId, amount } = req.body;
  // For demo: always success unless ?fail=true in query
  const fail = req.query.fail === 'true';
  if (fail) {
    return res.status(400).json({ orderId, status: 'FAILED' });
  }
  return res.json({ orderId, status: 'SUCCESS', transactionId: `tx-${Date.now()}` });
});

// Mock Order: create fake order
app.post('/v1/orders/simulate', (req, res) => {
  const orderId = req.body.orderId || `order-${Date.now()}`;
  return res.json({ orderId, status: 'CREATED' });
});

const PORT = process.env.MOCK_PORT || 4001;
const KEY = process.env.MOCK_KEY || './mock_services/key.pem';
const CERT = process.env.MOCK_CERT || './mock_services/cert.pem';

if (!fs.existsSync(KEY) || !fs.existsSync(CERT)) {
  console.error('Missing key.pem or cert.pem. Generate using the instructions in README or run:');
  console.error('  openssl req -nodes -new -x509 -keyout mock_services/key.pem -out mock_services/cert.pem -days 365 -subj "/CN=localhost"');
  process.exit(1);
}

const options = {
  key: fs.readFileSync(KEY),
  cert: fs.readFileSync(CERT)
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`Mock services running (HTTPS) on port ${PORT}`);
  console.log(`Catalog GET /v1/events/:id`);
  console.log(`Payment POST /v1/payments/simulate`);
  console.log(`Order POST /v1/orders/simulate`);
});
