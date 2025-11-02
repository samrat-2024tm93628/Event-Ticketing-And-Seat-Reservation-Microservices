const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');
const { calculateTotal } = require('../utils/calc');
const { saveKey } = require('../utils/idempotencyStore');
const reservationClient = require('../services/reservationClient');
const paymentClient = require('../services/paymentClient');
const { checkUserExists } = require('../services/userClient');
const { checkEventExists } = require('../services/catalogClient');
const config = require('../config');

const createOrder = async (req, res, next) => {
  const { userId, eventId, seats, paymentMethod } = req.body;
  const idempotencyKey = req.idempotencyKey;

  try {
    // Validate required fields
    if (!userId || !eventId || !seats || !Array.isArray(seats) || seats.length === 0) {
      logger.warn('Invalid order creation request', { userId, eventId, seats });
      return res.status(400).json({
        error: 'Invalid request',
        message: 'userId, eventId, and seats array are required'
      });
    }

    if (!idempotencyKey) {
      logger.warn('Order creation request missing idempotency key');
      return res.status(400).json({
        error: 'Idempotency key required',
        message: 'Idempotency-Key header is required'
      });
    }

    if (!paymentMethod) {
      logger.warn('Order creation request missing payment method');
      return res.status(400).json({
        error: 'Invalid request',
        message: 'paymentMethod is required'
      });
    }

    // Verify user exists
    try {
      await checkUserExists(userId);
    } catch (error) {
      logger.warn(`User verification failed: ${error.message}`);
      return res.status(404).json({
        error: 'User not found',
        message: error.message
      });
    }

    // Verify event exists
    try {
      await checkEventExists(eventId);
    } catch (error) {
      logger.warn(`Event verification failed: ${error.message}`);
      return res.status(404).json({
        error: 'Event not found',
        message: error.message
      });
    }

    const orderId = uuidv4();
    logger.info(`Creating order: ${orderId} for user: ${userId}, event: ${eventId}, seats: ${seats.join(',')}`);

    // Create order in CREATED state
    let order = new Order({
      orderId,
      userId,
      eventId,
      seats,
      total: 0,
      tax: 0,
      status: 'CREATED',
      paymentStatus: 'PENDING'
    });

    await order.save();
    logger.info(`Order created: ${orderId}`);

    // Step 1: Reserve seats
    let reservationDuration = config.idempotency.ttlSeconds || 900;
    logger.info(`Reserving seats for order ${orderId}, duration: ${reservationDuration}s`);

    let reservationResult;
    try {
      reservationResult = await reservationClient.reserveSeats({
        orderId,
        eventId,
        seats,
        durationSeconds: reservationDuration
      });
      logger.info(`Seats reserved successfully for order ${orderId}`);
    } catch (error) {
      logger.error(`Seat reservation failed for order ${orderId}:`, error.message);
      order.status = 'CANCELLED';
      await order.save();
      return res.status(409).json({
        error: 'Seat reservation failed',
        message: 'Selected seats are unavailable or conflict occurred',
        orderId
      });
    }

    // Step 2: Fetch seat prices and calculate total
    logger.info(`Fetching seat prices for order ${orderId}`);
    let seatPrices;
    try {
      const pricesResult = await reservationClient.getSeatPrices({
        eventId,
        seats
      });
      seatPrices = pricesResult.prices || [];
    } catch (error) {
      logger.error(`Failed to fetch seat prices for order ${orderId}:`, error.message);
      await reservationClient.releaseSeats({ orderId, eventId, seats });
      order.status = 'CANCELLED';
      await order.save();
      return res.status(500).json({
        error: 'Failed to calculate order total',
        orderId
      });
    }

    const { subtotal, tax, total } = calculateTotal(seatPrices);
    order.total = total;
    order.tax = tax;
    order.status = 'PENDING_PAYMENT';
    await order.save();
    logger.info(`Order total calculated: ${orderId}, total: ${total}, tax: ${tax}`);

    // Step 3: Charge payment
    logger.info(`Processing payment for order ${orderId}, amount: ${total}`);
    const chargeResult = await paymentClient.charge({
      orderId,
      amount: total,
      method: paymentMethod,
      idempotencyKey
    });

    if (!chargeResult.success) {
      logger.error(`Payment failed for order ${orderId}:`, chargeResult.raw);

      // Release seats on payment failure
      try {
        await reservationClient.releaseSeats({ orderId, eventId, seats });
        logger.info(`Seats released after payment failure for order ${orderId}`);
      } catch (releaseError) {
        logger.error(`Failed to release seats after payment failure for order ${orderId}:`, releaseError.message);
      }

      order.status = 'CANCELLED';
      order.paymentStatus = 'FAILED';
      await order.save();

      return res.status(402).json({
        error: 'Payment failed',
        message: chargeResult.raw.error || 'Unable to process payment',
        orderId
      });
    }

    // Step 4: Allocate seats and create tickets
    logger.info(`Allocating seats for order ${orderId}`);
    try {
      await reservationClient.allocateSeats({
        orderId,
        eventId,
        seats
      });
      logger.info(`Seats allocated for order ${orderId}`);
    } catch (error) {
      logger.error(`Seat allocation failed for order ${orderId}:`, error.message);
      // Attempt refund
      try {
        await paymentClient.refund({ paymentId: chargeResult.id });
        logger.info(`Payment refunded for order ${orderId}`);
      } catch (refundError) {
        logger.error(`Refund failed for order ${orderId}:`, refundError.message);
      }
      order.status = 'CANCELLED';
      order.paymentStatus = 'FAILED';
      await order.save();
      return res.status(500).json({
        error: 'Seat allocation failed',
        orderId
      });
    }

    // Create ticket documents
    const tickets = [];
    for (let i = 0; i < seats.length; i++) {
      const ticket = new Ticket({
        ticketId: uuidv4(),
        orderId,
        eventId,
        seat: seats[i],
        price: seatPrices[i] || 0,
        issuedAt: new Date()
      });
      await ticket.save();
      tickets.push(ticket);
    }
    logger.info(`Created ${tickets.length} tickets for order ${orderId}`);

    // Step 5: Update order to CONFIRMED and save idempotency key
    order.status = 'CONFIRMED';
    order.paymentStatus = 'PAID';
    await order.save();

    await saveKey(idempotencyKey, orderId, config.idempotency.ttlSeconds);
    logger.info(`Order confirmed: ${orderId}`);

    res.status(200).json({
      message: 'Order created successfully',
      order,
      tickets
    });
  } catch (error) {
    logger.error('Unexpected error in createOrder:', error.message);
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  const orderId = req.params.id;

  try {
    logger.info(`Fetching order: ${orderId}`);
    const order = await Order.findOne({ orderId });

    if (!order) {
      logger.warn(`Order not found: ${orderId}`);
      return res.status(404).json({
        error: 'Order not found',
        orderId
      });
    }

    // Fetch associated tickets
    const tickets = await Ticket.find({ orderId });

    res.status(200).json({
      order,
      tickets
    });
  } catch (error) {
    logger.error('Error fetching order:', error.message);
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  const orderId = req.params.id;

  try {
    logger.info(`Cancelling order: ${orderId}`);
    const order = await Order.findOne({ orderId });

    if (!order) {
      logger.warn(`Order not found for cancellation: ${orderId}`);
      return res.status(404).json({
        error: 'Order not found',
        orderId
      });
    }

    if (order.status === 'CONFIRMED') {
      logger.warn(`Cannot cancel confirmed order: ${orderId}`);
      return res.status(409).json({
        error: 'Cannot cancel confirmed order',
        message: 'Only non-confirmed orders can be cancelled',
        orderId
      });
    }

    // Release seats
    try {
      await reservationClient.releaseSeats({
        orderId,
        eventId: order.eventId,
        seats: order.seats
      });
      logger.info(`Seats released for cancelled order: ${orderId}`);
    } catch (error) {
      logger.error(`Failed to release seats for order ${orderId}:`, error.message);
      // Continue with cancellation even if release fails
    }

    order.status = 'CANCELLED';
    await order.save();
    logger.info(`Order cancelled: ${orderId}`);

    res.status(200).json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    logger.error('Error cancelling order:', error.message);
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrder,
  cancelOrder
};

