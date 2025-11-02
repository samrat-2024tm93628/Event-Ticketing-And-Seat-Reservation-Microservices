const logger = require('../utils/logger');
const idempotencyStore = require('../utils/idempotencyStore');
const Order = require('../models/Order');

const idempotencyMiddleware = async (req, res, next) => {
  // Only apply to POST requests
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    logger.warn('POST /orders request missing Idempotency-Key header');
    return res.status(400).json({
      error: 'Idempotency-Key header is required for POST requests'
    });
  }

  try {
    // Check if key already exists
    const existingOrderId = await idempotencyStore.getOrderForKey(idempotencyKey);

    if (existingOrderId) {
      logger.info(`Idempotent request detected for key: ${idempotencyKey}, returning existing order: ${existingOrderId}`);

      const existingOrder = await Order.findOne({ orderId: existingOrderId });
      if (existingOrder) {
        return res.status(200).json({
          message: 'Idempotent response',
          order: existingOrder
        });
      }
    }

    // Key doesn't exist, allow request to proceed
    req.idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    logger.error('Error checking idempotency key:', error.message);
    return res.status(500).json({
      error: 'Internal server error while processing idempotency'
    });
  }
};

module.exports = idempotencyMiddleware;

