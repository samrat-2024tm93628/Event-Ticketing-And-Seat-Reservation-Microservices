require('dotenv').config();

const config = {
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/order-service'
  },
  port: process.env.PORT || 3001,
  services: {
    reservationServiceUrl: process.env.RESERVATION_SERVICE_URL || 'http://localhost:3002/v1/seats',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3004/v1/users',
    catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:3005/v1/events'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_key',
    issuer: process.env.JWT_ISSUER || 'https://auth.local/',
    audience: process.env.JWT_AUDIENCE || 'payment-service',
    serviceUserId: process.env.SERVICE_USER_ID || 'order-service',
    serviceEmail: process.env.SERVICE_EMAIL || 'order-service@internal'
  },
  idempotency: {
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '3600', 10)
  },
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;

