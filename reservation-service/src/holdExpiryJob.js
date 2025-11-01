/**
 * This file contains a cron job that periodically releases expired holds.
 * The job finds all holds that have expired, marks them as RELEASED and sets the status of the corresponding seat back to AVAILABLE if it is still HELD.
 * If any error occurs during the process, it rolls back the transaction and logs the error.
 */
const db = require('./db');
const { seat_reservations_failed_total } = require('./metrics');
const cron = require('cron');

/**
 * Periodically called function to release expired holds.
 * This function is run by a cron job every minute.
 * It finds all holds that have expired (whose expires_at timestamp is in the past)
 * and marks them as RELEASED. If the corresponding seat is still HELD, it sets
 * the status of the seat back to AVAILABLE.
 * If any error occurs during the process, it rolls back the transaction and
 * logs the error.
 * @return {Promise<void>}
 */
async function expireHolds() {
  const now = new Date();
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // find expired holds
    const { rows } = await client.query(
      `SELECT hold_id, seat_id FROM seat_holds WHERE expires_at <= now() AND status = 'HELD' FOR UPDATE`
    );
    for (const h of rows) {
      // mark hold released
      await client.query(`UPDATE seat_holds SET status='RELEASED' WHERE hold_id = $1`, [h.hold_id]);
      // set availability back to AVAILABLE if still HELD
      await client.query(
        `UPDATE seat_availability SET status='AVAILABLE', last_updated = now() WHERE seat_id = $1 AND status='HELD'`,
        [h.seat_id]
      );
    }
    await client.query('COMMIT');
    if (rows.length > 0) {
      console.log(`[holdExpiryJob] released ${rows.length} holds`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('holdExpiryJob error', err);
    seat_reservations_failed_total.inc();
  } finally {
    client.release();
  }
}

// run every minute
const job = new cron.CronJob('*/1 * * * *', expireHolds, null, true);
module.exports = { job, expireHolds };
