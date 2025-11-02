const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { handlePaymentCallback, handleReservationCallback } = require('../events/handlers');

// POST /v1/webhooks/payment - Payment service callback
router.post('/payment', async (req, res, next) => {
  const { orderId, status, paymentId } = req.body;

  try {
    logger.info(`Payment webhook received for order: ${orderId}, status: ${status}`);

    if (!orderId || !status) {
      logger.warn('Invalid payment webhook payload');
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'orderId and status are required'
      });
    }

    await handlePaymentCallback({ orderId, status, paymentId });

    res.status(200).json({
      message: 'Payment callback processed successfully'
    });
  } catch (error) {
    logger.error('Error processing payment webhook:', error.message);
    next(error);
  }
});

// POST /v1/webhooks/reservation - Reservation service callback
router.post('/reservation', async (req, res, next) => {
  const { orderId, event, seats, action } = req.body;

  try {
    logger.info(`Reservation webhook received for order: ${orderId}, action: ${action}`);

    if (!orderId || !action) {
      logger.warn('Invalid reservation webhook payload');
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'orderId and action are required'
      });
    }

    await handleReservationCallback({ orderId, event, seats, action });

    res.status(200).json({
      message: 'Reservation callback processed successfully'
    });
  } catch (error) {
    logger.error('Error processing reservation webhook:', error.message);
    next(error);
  }
});

module.exports = router;

