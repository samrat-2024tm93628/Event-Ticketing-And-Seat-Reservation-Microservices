const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const reservationClient = axios.create({
  baseURL: config.services.reservationServiceUrl,
  timeout: 10000
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const retry = async (fn, retryCount = 0) => {
  try {
    return await fn();
  } catch (error) {
    if (retryCount < MAX_RETRIES - 1) {
      logger.warn(`Reservation service call failed (attempt ${retryCount + 1}/${MAX_RETRIES}), retrying...`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return retry(fn, retryCount + 1);
    } else {
      logger.error(`Reservation service call failed after ${MAX_RETRIES} attempts`, error.message);
      throw error;
    }
  }
};

const reserveSeats = async ({ orderId, eventId, seats, durationSeconds }) => {
  return retry(async () => {
    const response = await reservationClient.post('/reserve', {
      orderId,
      eventId,
      seats,
      durationSeconds
    });
    return response.data;
  });
};

const allocateSeats = async ({ orderId, eventId, seats }) => {
  return retry(async () => {
    const response = await reservationClient.post('/allocate', {
      orderId,
      eventId,
      seats
    });
    return response.data;
  });
};

const releaseSeats = async ({ orderId, eventId, seats }) => {
  return retry(async () => {
    const response = await reservationClient.post('/release', {
      orderId,
      eventId,
      seats
    });
    return response.data;
  });
};

const getSeatPrices = async ({ eventId, seats }) => {
  return retry(async () => {
    const response = await reservationClient.post('/seat-prices', {
      eventId,
      seats
    });
    return response.data;
  });
};

module.exports = {
  reserveSeats,
  allocateSeats,
  releaseSeats,
  getSeatPrices
};

