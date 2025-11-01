/**
 * Node.js application for a seat reservation service
 * @module app
 * 
 */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const seatsRouter = require('./routes/seats');
const { client: promClient } = require('./metrics');
const { job } = require('./holdExpiryJob');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(pinoHttp({ logger }));

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// metrics for prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.use('/', seatsRouter);

const port = process.env.PORT || 3001;

// start expiration job
job.start();

app.listen(port, () => {
  logger.info(`Reservation Service listening on port ${port}`);
});
