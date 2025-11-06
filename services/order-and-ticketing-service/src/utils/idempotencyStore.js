const IdempotencyKey = require('../models/IdempotencyKey');
const logger = require('./logger');

const saveKey = async (key, orderId, ttlSeconds) => {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    const idempotencyRecord = new IdempotencyKey({
      key,
      createdAt: new Date(),
      expiresAt
    });

    await idempotencyRecord.save();
    logger.info(`Idempotency key saved: ${key} for orderId: ${orderId}, expires in ${ttlSeconds}s`);
    
    return idempotencyRecord;
  } catch (error) {
    logger.error(`Failed to save idempotency key: ${key}`, error.message);
    throw error;
  }
};

const getOrderForKey = async (key) => {
  try {
    const record = await IdempotencyKey.findOne({ key });
    
    if (!record) {
      return null;
    }

    // Check if key has expired
    if (record.expiresAt < new Date()) {
      logger.info(`Idempotency key expired: ${key}`);
      await IdempotencyKey.deleteOne({ key });
      return null;
    }

    // Extract orderId from the key or metadata
    // Note: This assumes the key format or a separate mapping
    // For now, we return the key itself; controller will handle mapping
    return record.orderId || null;
  } catch (error) {
    logger.error(`Failed to retrieve idempotency key: ${key}`, error.message);
    throw error;
  }
};

module.exports = {
  saveKey,
  getOrderForKey
};

