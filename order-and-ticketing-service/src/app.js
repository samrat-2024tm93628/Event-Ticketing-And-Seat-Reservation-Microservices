require('dotenv').config();
const express = require('express');
const config = require('./config');
const db = require('./config/db');
const logger = require('./utils/logger');
const ordersRouter = require('./routes/orders');
const webhooksRouter = require('./routes/webhooks');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = config.port;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/v1/orders', ordersRouter);
app.use('/v1/webhooks', webhooksRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await db.connect();
    logger.info('Database connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`Order Service listening on port ${PORT}`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

