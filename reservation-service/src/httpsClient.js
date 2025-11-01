/**
 * This file contains a simple HTTPS client using Axios and the https module.
 * The client is configured to use an https agent with rejectUnauthorized set to true by default,
 * but this can be overridden by setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to 0.
 * The client is exported as a single object.
 */
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' // default true; set 0 only for local dev if self-signed
});

const client = axios.create({ httpsAgent, timeout: 8000 });

module.exports = client;
