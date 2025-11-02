// path: src/services/catalogClient.js
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const catalogClient = axios.create({
  baseURL: config.services.catalogServiceUrl,
  timeout: 10000
});

const checkEventExists = async (eventId) => {
  try {
    logger.info(`Checking if event exists: ${eventId}`);
    const response = await catalogClient.get(`/${eventId}`);
    logger.info(`Event verified: ${eventId}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logger.warn(`Event not found: ${eventId}`);
      throw new Error(`Event not found: ${eventId}`);
    }
    logger.error(`Error checking event existence for ${eventId}:`, error.message);
    throw error;
  }
};

module.exports = {
  checkEventExists
};

