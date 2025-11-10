/**
 * This file contains the seat reservation router, handling POST /reserve and POST /allocate requests.
 * The router is built using Express.js and uses the following best practices:
 * - Each route is handled by a separate, named function.
 * - Error handling is done using try-catch blocks.
 * - The router uses a single, consistent naming convention for variables and functions.
 * - The router does not contain any business logic, instead relying on the db and metrics modules for data access and metrics tracking.
 */
const express = require('express');
const db = require('../db');
const uuid = require('uuid');
const httpsClient = require('../httpsClient');
const { seat_reservations_total, seat_reservations_failed_total, seat_allocations_total } = require('../metrics');

const router = express.Router();

/**
 * GET /v1/seats?eventId=
 * Return seat_availability rows for an event
 */
router.get('/', async (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  try {
    const { rows } = await db.query('SELECT seat_id, section, row, seat_number, price, status FROM seat_availability WHERE event_id = $1', [eventId]);
    return res.json({ seats: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'failed' });
  }
});

/**
 * GET /v1/holds/:holdId
 * Retrieve hold by holdId
 */
router.get('/holds/:holdId', async (req, res) => {
  const { holdId } = req.params;
  try {
    const { rows } = await db.query('SELECT hold_id, idempotency_key, order_id, event_id, seat_id, user_id, created_at, expires_at, status FROM seat_holds WHERE hold_id = $1', [holdId]);
    if (!rows.length) return res.status(404).json({ error: 'hold not found' });
    return res.json({ hold: rows[0] });
  } catch (err) {
    console.error('get hold error', err);
    return res.status(500).json({ error: 'failed' });
  }
});

/**
 * POST /v1/seats/reserve
 * Body: { orderId, eventId, seats: [seat_id], userId }
 * Idempotency-Key header optional but recommended.
 *
 * NOTE: This implementation inserts one hold row per seat and returns an array of holdIds.
 */
router.post('/reserve', async (req, res) => {
  seat_reservations_total.inc();
  const idempotencyKey = req.header('Idempotency-Key') || null;
  const { orderId, eventId, seats, userId } = req.body;
  if (!orderId || !eventId || !seats || !Array.isArray(seats) || seats.length === 0) {
    seat_reservations_failed_total.inc();
    return res.status(400).json({ error: 'orderId, eventId and seats[] required' });
  }

  // idempotency lookup
  if (idempotencyKey) {
    const r = await db.query('SELECT response_code, response_body FROM idempotency_keys WHERE idempotency_key = $1', [idempotencyKey]);
    if (r.rows.length) {
      const { response_code, response_body } = r.rows[0];
      return res.status(response_code).json(response_body);
    }
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // verify event state with Catalog (if Catalog URL is set)
    const CATALOG_URL = process.env.CATALOG_URL || null;
    if (CATALOG_URL) {
      try {
        const ev = await httpsClient.get(`${CATALOG_URL}/v1/events/${eventId}`);
        if (!ev.data || ev.data.status !== 'ON_SALE') {
          await client.query('ROLLBACK');
          seat_reservations_failed_total.inc();
          const resp = { error: 'Event not on sale' };
          if (idempotencyKey) {
            await db.query('INSERT INTO idempotency_keys(idempotency_key, response_code, response_body) VALUES ($1, $2, $3) ON CONFLICT (idempotency_key) DO NOTHING', [idempotencyKey, 409, resp]);
          }
          return res.status(409).json(resp);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        seat_reservations_failed_total.inc();
        return res.status(503).json({ error: 'Could not verify event status' });
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    const reservedSeats = []; // { holdId, seatId, price }

    for (const seatId of seats) {
      // lock seat row
      const s = await client.query('SELECT seat_id, status, price FROM seat_availability WHERE seat_id = $1 FOR UPDATE', [seatId]);
      if (s.rows.length === 0) {
        throw { status: 404, message: `Seat ${seatId} not found` };
      }
      const row = s.rows[0];
      if (row.status !== 'AVAILABLE') {
        throw { status: 409, message: `Seat ${seatId} not available` };
      }
      // mark HELD on seat_availability
      await client.query('UPDATE seat_availability SET status = $1, last_updated = now() WHERE seat_id = $2', ['HELD', seatId]);
      // insert hold with deterministic holdId
      const holdId = uuid.v4();
      await client.query(
        `INSERT INTO seat_holds(hold_id, idempotency_key, order_id, event_id, seat_id, user_id, created_at, expires_at, status) VALUES ($1,$2,$3,$4,$5,$6,now(),$7,'HELD')`,
        [holdId, idempotencyKey, orderId, eventId, seatId, userId, expiresAt]
      );
      reservedSeats.push({ holdId, seatId, price: row.price });
    }

    await client.query('COMMIT');

    const response = { holdIds: reservedSeats.map(s => s.holdId), reserved: reservedSeats, expires_at: expiresAt.toISOString() };

    if (idempotencyKey) {
      await db.query('INSERT INTO idempotency_keys(idempotency_key, response_code, response_body) VALUES ($1, $2, $3) ON CONFLICT (idempotency_key) DO NOTHING', [idempotencyKey, 200, response]);
    }

    return res.json(response);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reserve error', err);
    seat_reservations_failed_total.inc();
    const code = err.status || 500;
    const message = err.message || 'reservation failed';
    if (idempotencyKey) {
      const resp = { error: message };
      await db.query('INSERT INTO idempotency_keys(idempotency_key, response_code, response_body) VALUES ($1, $2, $3) ON CONFLICT (idempotency_key) DO NOTHING', [idempotencyKey, code, resp]);
    }
    return res.status(code).json({ error: message });
  } finally {
    client.release();
  }
});

/**
 * POST /v1/seats/allocate
 * Body: { orderId, eventId, seats: [seat_id], holdIds: [hold_id] }
 * Called after payment SUCCESS. Moves HELD -> ALLOCATED atomically.
 */
router.post('/allocate', async (req, res) => {
  const { orderId, eventId, seats, holdIds } = req.body;
  if (!orderId || !eventId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'orderId, eventId and seats[] required' });
  }
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    // lock seats
    const seatsLocked = [];
    for (const seatId of seats) {
      const s = await client.query('SELECT seat_id, status, section, row, seat_number, price FROM seat_availability WHERE seat_id = $1 FOR UPDATE', [seatId]);
      if (!s.rows.length) throw { status: 404, message: `Seat ${seatId} not found` };
      if (s.rows[0].status !== 'HELD') throw { status: 409, message: `Seat ${seatId} is not held` };
      seatsLocked.push(s.rows[0]);
      // update seat_availability to ALLOCATED
      await client.query('UPDATE seat_availability SET status = $1 WHERE seat_id = $2', ['ALLOCATED', seatId]);
    }

    // mark related holds as ALLOCATED
    if (Array.isArray(holdIds) && holdIds.length > 0) {
      for (const hid of holdIds) {
        await client.query('UPDATE seat_holds SET status = $1 WHERE hold_id = $2', ['ALLOCATED', hid]);
      }
    } else {
      // fallback: mark holds linked to seats as ALLOCATED
      for (const seatId of seats) {
        await client.query('UPDATE seat_holds SET status = $1 WHERE seat_id = $2 AND status = $3', ['ALLOCATED', seatId, 'HELD']);
      }
    }

    // create allocation record with seat snapshot
    const seatsSnap = seatsLocked.map(s => ({ seat_id: s.seat_id, section: s.section, row: s.row, seat_number: s.seat_number, price: s.price }));
    await client.query('INSERT INTO seat_allocations(allocation_id, order_id, event_id, seats, created_at) VALUES ($1,$2,$3,$4,now())', [uuid.v4(), orderId, eventId, JSON.stringify(seatsSnap)]);

    await client.query('COMMIT');
    seat_allocations_total.inc();
    return res.json({ allocated: seatsSnap });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('allocate error', err);
    return res.status(err.status || 500).json({ error: err.message || 'allocation failed' });
  } finally {
    client.release();
  }
});

/**
 * POST /v1/seats/release
 * Body: { holdIds: [hold_id] } or { seats: [seat_id] }
 */
router.post('/release', async (req, res) => {
  const { holdIds, seats } = req.body;
  if (!Array.isArray(holdIds) && !Array.isArray(seats)) {
    return res.status(400).json({ error: 'holdIds[] or seats[] required' });
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    if (Array.isArray(holdIds)) {
      for (const hid of holdIds) {
        // find seat for hold and release
        const r = await client.query('SELECT seat_id FROM seat_holds WHERE hold_id = $1 FOR UPDATE', [hid]);
        if (r.rows.length) {
          const seatId = r.rows[0].seat_id;
          await client.query('UPDATE seat_holds SET status = $1 WHERE hold_id = $2', ['RELEASED', hid]);
          await client.query('UPDATE seat_availability SET status = $1 WHERE seat_id = $2 AND status = $3', ['AVAILABLE', seatId, 'HELD']);
        }
      }
    }
    if (Array.isArray(seats)) {
      for (const seatId of seats) {
        await client.query('UPDATE seat_holds SET status = $1 WHERE seat_id = $2 AND status = $3', ['RELEASED', seatId, 'HELD']);
        await client.query('UPDATE seat_availability SET status = $1 WHERE seat_id = $2 AND status = $3', ['AVAILABLE', seatId, 'HELD']);
      }
    }
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('release error', err);
    return res.status(500).json({ error: 'release failed' });
  } finally {
    client.release();
  }
});

/**
 * POST /v1/seats/seat-prices
 * Body: { eventId, seats: [seat_id] }
 * Returns the price for each seat (authoritative pricing from reservation service)
 */
router.post('/seat-prices', async (req, res) => {
  const { eventId, seats } = req.body;
  if (!eventId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'eventId and seats[] required' });
  }

  try {
    const prices = [];
    for (const seatId of seats) {
      const result = await db.query('SELECT seat_id, price FROM seat_availability WHERE seat_id = $1 AND event_id = $2', [seatId, eventId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Seat ${seatId} not found for event ${eventId}` });
      }
      prices.push(result.rows[0].price);
    }
    return res.json({ prices });
  } catch (err) {
    console.error('seat-prices error', err);
    return res.status(500).json({ error: 'failed to fetch seat prices' });
  }
});

module.exports = router;
