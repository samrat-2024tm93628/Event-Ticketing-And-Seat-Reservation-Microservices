const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const paymentClient = axios.create({
  baseURL: config.services.paymentServiceUrl,
  timeout: 10000
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

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
    const response = await retry(async () => {
      return await paymentClient.post('/charge', {
        orderId,
        amount,
        method
      }, {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
    });
    
    return {
      success: true,
      id: response.data.paymentId || response.data.id,
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
    const response = await retry(async () => {
      return await paymentClient.post('/refund', {
        paymentId
      });
    });
    
    return {
      success: true,
      id: response.data.refundId || response.data.id,
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

