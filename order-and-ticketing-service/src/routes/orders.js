const express = require('express');
const router = express.Router();
const idempotencyMiddleware = require('../middleware/idempotency');
const validateOrderRequest = require('../middleware/validateOrderRequest');
const { createOrder, getOrder, cancelOrder } = require('../controllers/ordersController');

// POST /v1/orders - Create new order with validation and idempotency
router.post('/', validateOrderRequest, idempotencyMiddleware, createOrder);

// GET /v1/orders/:id - Get order by ID
router.get('/:id', getOrder);

// POST /v1/orders/:id/cancel - Cancel order
router.post('/:id/cancel', cancelOrder);

module.exports = router;

