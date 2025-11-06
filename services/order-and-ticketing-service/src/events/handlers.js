const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');
const reservationClient = require('../services/reservationClient');
const paymentClient = require('../services/paymentClient');

const handlePaymentCallback = async ({ orderId, status, paymentId }) => {
  try {
    logger.info(`Processing payment callback for order: ${orderId}, status: ${status}`);

    const order = await Order.findOne({ orderId });

    if (!order) {
      logger.warn(`Order not found for payment callback: ${orderId}`);
      return;
    }

    // Idempotency check: only process if order is in PENDING_PAYMENT state
    if (order.status !== 'PENDING_PAYMENT') {
      logger.info(`Order ${orderId} not in PENDING_PAYMENT state, skipping payment callback`);
      return;
    }

    if (status === 'PAID') {
      logger.info(`Payment confirmed for order: ${orderId}`);

      // Allocate seats
      try {
        await reservationClient.allocateSeats({
          orderId,
          eventId: order.eventId,
          seats: order.seats
        });
        logger.info(`Seats allocated for order: ${orderId}`);
      } catch (error) {
        logger.error(`Failed to allocate seats for order ${orderId}:`, error.message);
        // Attempt refund
        try {
          await paymentClient.refund({ paymentId });
          logger.info(`Payment refunded for order: ${orderId}`);
        } catch (refundError) {
          logger.error(`Refund failed for order ${orderId}:`, refundError.message);
        }
        order.status = 'CANCELLED';
        order.paymentStatus = 'FAILED';
        await order.save();
        return;
      }

      // Create tickets
      const tickets = [];
      for (let i = 0; i < order.seats.length; i++) {
        const ticket = new Ticket({
          ticketId: uuidv4(),
          orderId,
          eventId: order.eventId,
          seat: order.seats[i],
          price: 0, // Price should be fetched from order or reservation service
          issuedAt: new Date()
        });
        await ticket.save();
        tickets.push(ticket);
      }
      logger.info(`Created ${tickets.length} tickets for order: ${orderId}`);

      // Update order to CONFIRMED
      order.status = 'CONFIRMED';
      order.paymentStatus = 'PAID';
      await order.save();
      logger.info(`Order confirmed: ${orderId}`);
    } else if (status === 'FAILED') {
      logger.info(`Payment failed for order: ${orderId}`);

      // Release seats
      try {
        await reservationClient.releaseSeats({
          orderId,
          eventId: order.eventId,
          seats: order.seats
        });
        logger.info(`Seats released after payment failure for order: ${orderId}`);
      } catch (error) {
        logger.error(`Failed to release seats for order ${orderId}:`, error.message);
      }

      // Update order to CANCELLED
      order.status = 'CANCELLED';
      order.paymentStatus = 'FAILED';
      await order.save();
      logger.info(`Order cancelled due to payment failure: ${orderId}`);
    }
  } catch (error) {
    logger.error('Error handling payment callback:', error.message);
    throw error;
  }
};

const handleReservationCallback = async ({ orderId, event, seats, action }) => {
  try {
    logger.info(`Processing reservation callback for order: ${orderId}, action: ${action}`);

    const order = await Order.findOne({ orderId });

    if (!order) {
      logger.warn(`Order not found for reservation callback: ${orderId}`);
      return;
    }

    if (action === 'EXPIRED') {
      logger.info(`Reservation expired for order: ${orderId}`);

      // Idempotency check: only cancel if order is still in PENDING_PAYMENT or CREATED state
      if (order.status === 'PENDING_PAYMENT' || order.status === 'CREATED') {
        logger.info(`Cancelling order ${orderId} due to reservation expiration`);

        // Release seats
        try {
          await reservationClient.releaseSeats({
            orderId,
            eventId: order.eventId,
            seats: order.seats
          });
          logger.info(`Seats released for expired order: ${orderId}`);
        } catch (error) {
          logger.error(`Failed to release seats for order ${orderId}:`, error.message);
        }

        // If payment was made, attempt refund
        if (order.paymentStatus === 'PAID') {
          logger.info(`Attempting refund for expired order: ${orderId}`);
          try {
            // Note: We don't have paymentId here, so this may need adjustment
            // In a real scenario, paymentId should be stored in the Order model
            logger.warn(`Cannot refund order ${orderId}: paymentId not available in callback`);
          } catch (error) {
            logger.error(`Refund failed for order ${orderId}:`, error.message);
          }
        }

        order.status = 'CANCELLED';
        await order.save();
        logger.info(`Order cancelled: ${orderId}`);
      } else {
        logger.info(`Order ${orderId} not in cancellable state, skipping expiration handler`);
      }
    }
  } catch (error) {
    logger.error('Error handling reservation callback:', error.message);
    throw error;
  }
};

module.exports = {
  handlePaymentCallback,
  handleReservationCallback
};

