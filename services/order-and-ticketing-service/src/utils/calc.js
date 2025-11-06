const logger = require('./logger');

const calculateTotal = (seatPricesArray) => {
  try {
    if (!Array.isArray(seatPricesArray) || seatPricesArray.length === 0) {
      logger.warn('calculateTotal called with empty or invalid array');
      return {
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }

    // Calculate subtotal
    const subtotal = seatPricesArray.reduce((sum, price) => {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) {
        logger.warn(`Invalid price value: ${price}, treating as 0`);
        return sum;
      }
      return sum + numPrice;
    }, 0);

    // Calculate tax (5% of subtotal)
    const tax = parseFloat((subtotal * 0.05).toFixed(2));

    // Calculate total
    const total = parseFloat((subtotal + tax).toFixed(2));

    logger.debug(`Order calculation: subtotal=${subtotal}, tax=${tax}, total=${total}`);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      total
    };
  } catch (error) {
    logger.error('Error calculating order total:', error.message);
    throw error;
  }
};

module.exports = {
  calculateTotal
};

