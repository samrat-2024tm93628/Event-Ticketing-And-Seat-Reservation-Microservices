const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    eventId: {
      type: String,
      required: true,
      index: true
    },
    seats: {
      type: [String],
      required: true,
      default: []
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
      default: 'CREATED',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
      index: true
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

module.exports = mongoose.model('Order', orderSchema);

