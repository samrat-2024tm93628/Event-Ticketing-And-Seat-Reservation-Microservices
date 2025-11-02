// path: src/middleware/validateOrderRequest.js
const Joi = require('joi');
const logger = require('../utils/logger');

const orderSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'any.required': 'userId is required',
      'string.base': 'userId must be a string'
    }),
  eventId: Joi.string()
    .required()
    .messages({
      'any.required': 'eventId is required',
      'string.base': 'eventId must be a string'
    }),
  seats: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'any.required': 'seats array is required',
      'array.base': 'seats must be an array',
      'array.min': 'seats array must contain at least one seat'
    }),
  paymentMethod: Joi.string()
    .valid('UPI', 'CARD', 'NETBANKING')
    .required()
    .messages({
      'any.required': 'paymentMethod is required',
      'string.base': 'paymentMethod must be a string',
      'any.only': 'paymentMethod must be one of: UPI, CARD, NETBANKING'
    })
});

const validateOrderRequest = (req, res, next) => {
  const { error, value } = orderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map(detail => detail.message);
    logger.warn('Order request validation failed', { messages, body: req.body });
    return res.status(400).json({
      error: 'Validation failed',
      messages
    });
  }

  // Attach validated data to request
  req.validatedBody = value;
  next();
};

module.exports = validateOrderRequest;

