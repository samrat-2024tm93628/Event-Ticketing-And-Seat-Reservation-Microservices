// path: src/services/userClient.js
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const userClient = axios.create({
  baseURL: config.services.userServiceUrl,
  timeout: 10000
});

const checkUserExists = async (userId) => {
  try {
    logger.info(`Checking if user exists: ${userId}`);
    const response = await userClient.get(`/${userId}`);
    logger.info(`User verified: ${userId}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logger.warn(`User not found: ${userId}`);
      throw new Error(`User not found: ${userId}`);
    }
    logger.error(`Error checking user existence for ${userId}:`, error.message);
    throw error;
  }
};

module.exports = {
  checkUserExists
};

