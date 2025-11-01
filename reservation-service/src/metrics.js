/**
 * This file contains the metrics for the seat reservation service.
 * It uses the prom-client library to create counters for seat reservations, failed reservations and allocations.
 * The metrics are exposed via the /metrics endpoint.
 * @module metrics
 */
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const seat_reservations_total = new client.Counter({ name: 'seat_reservations_total', help: 'Total seat reserve attempts' });
const seat_reservations_failed_total = new client.Counter({ name: 'seat_reservations_failed_total', help: 'Failed reserves' });
const seat_allocations_total = new client.Counter({ name: 'seat_allocations_total', help: 'Total seat allocations' });

module.exports = { client, seat_reservations_total, seat_reservations_failed_total, seat_allocations_total };
