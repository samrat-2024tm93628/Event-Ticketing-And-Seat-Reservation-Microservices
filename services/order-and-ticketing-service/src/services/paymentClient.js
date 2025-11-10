const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const paymentClient = axios.create({
  baseURL: config.services.paymentServiceUrl,
  timeout: 10000
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

// Generate a service-to-service JWT token for payment service authentication
const generateServiceToken = () => {
  const token = jwt.sign(
    {
      sub: config.jwt.serviceUserId,
      email: config.jwt.serviceEmail,
      roles: ['payments:write']
    },
    config.jwt.secret,
    {
      algorithm: 'HS256',
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: '1h'
    }
  );
  return token;
};

const retry = async (fn, retryCount = 0) => {
  try {
    return await fn();
  } catch (error) {
    if (retryCount < MAX_RETRIES - 1) {
      logger.warn(`Payment service call failed (attempt ${retryCount + 1}/${MAX_RETRIES}), retrying...`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return retry(fn, retryCount + 1);
    } else {
      logger.error(`Payment service call failed after ${MAX_RETRIES} attempts`, error.message);
      throw error;
    }
  }
};

const charge = async ({ orderId, amount, method, idempotencyKey }) => {
  try {
    const token = generateServiceToken();
    const response = await retry(async () => {
      return await paymentClient.post('/v1/payments/charge', {
        order_id: orderId,
        amount,
        method,
        idempotency_key: idempotencyKey
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        }
      });
    });
    
    return {
      success: true,
      id: response.data.payment_id || response.data.id,
      raw: response.data
    };
  } catch (error) {
    logger.error('Charge operation failed', error.message);
    return {
      success: false,
      id: null,
      raw: error.response?.data || { error: error.message }
    };
  }
};

const refund = async ({ paymentId }) => {
  try {
    const token = generateServiceToken();
    const response = await retry(async () => {
      return await paymentClient.post('/v1/payments/refund', {
        payment_id: paymentId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    });
    
    return {
      success: true,
      id: response.data.payment_id || response.data.id,
      raw: response.data
    };
  } catch (error) {
    logger.error('Refund operation failed', error.message);
    return {
      success: false,
      id: null,
      raw: error.response?.data || { error: error.message }
    };
  }
};

module.exports = {
  charge,
  refund
};

