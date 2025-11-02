const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./index');

mongoose.set('strictQuery', false);

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const connectDB = async (retryCount = 0) => {
  try {
    await mongoose.connect(config.mongo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
    
    if (retryCount < MAX_RETRIES - 1) {
      logger.info(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    } else {
      logger.error('Max retries reached. Failed to connect to MongoDB.');
      throw error;
    }
  }
};

module.exports = {
  connect: connectDB
};

