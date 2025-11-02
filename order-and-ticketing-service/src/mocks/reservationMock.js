const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Mock reservation data store
const reservations = new Map();
const allocations = new Map();

// POST /reserve - Reserve seats temporarily
app.post('/reserve', (req, res) => {
  const { orderId, eventId, seats, durationSeconds } = req.body;

  if (!orderId || !eventId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  console.log(`[Reservation Mock] Reserving seats for order ${orderId}: ${seats.join(',')}`);

  // Store reservation
  reservations.set(orderId, {
    eventId,
    seats,
    reservedAt: new Date(),
    expiresAt: new Date(Date.now() + (durationSeconds || 900) * 1000)
  });

  res.status(200).json({
    success: true,
    orderId,
    eventId,
    seats,
    reservationId: `RES-${orderId}`,
    expiresAt: reservations.get(orderId).expiresAt
  });
});

// POST /allocate - Allocate seats permanently
app.post('/allocate', (req, res) => {
  const { orderId, eventId, seats } = req.body;

  if (!orderId || !eventId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  console.log(`[Reservation Mock] Allocating seats for order ${orderId}: ${seats.join(',')}`);

  // Check if reservation exists
  if (!reservations.has(orderId)) {
    return res.status(409).json({
      error: 'Reservation not found',
      orderId
    });
  }

  // Store allocation
  allocations.set(orderId, {
    eventId,
    seats,
    allocatedAt: new Date()
  });

  res.status(200).json({
    success: true,
    orderId,
    eventId,
    seats,
    allocationId: `ALLOC-${orderId}`
  });
});

// POST /release - Release reserved or allocated seats
app.post('/release', (req, res) => {
  const { orderId, eventId, seats } = req.body;

  if (!orderId || !eventId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  console.log(`[Reservation Mock] Releasing seats for order ${orderId}: ${seats.join(',')}`);

  // Remove reservation and allocation
  reservations.delete(orderId);
  allocations.delete(orderId);

  res.status(200).json({
    success: true,
    orderId,
    eventId,
    seats,
    message: 'Seats released successfully'
  });
});

// POST /seat-prices - Get seat prices
app.post('/seat-prices', (req, res) => {
  const { eventId, seats } = req.body;

  if (!eventId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  console.log(`[Reservation Mock] Fetching prices for event ${eventId}, seats: ${seats.join(',')}`);

  // Return mock prices (100 per seat)
  const prices = seats.map(() => 100);

  res.status(200).json({
    success: true,
    eventId,
    seats,
    prices
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'reservation-mock' });
});

app.listen(PORT, () => {
  console.log(`Reservation Mock Service listening on port ${PORT}`);
});

