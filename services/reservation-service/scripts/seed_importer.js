/**
 * Seed Importer Script
 *
 * This script imports a CSV file into the seat availability table.
 * It expects a path to the CSV file as an argument.
 * The script uses the csv-parser library to parse the CSV file and the db module to interact with the database.
 *
 * The script assumes that the CSV file has the following columns:
 * - seat_id
 * - event_id
 * - section
 * - row
 * - seat_number
 * - price
 * - status
 *
 * The script logs an error message and exits if the argument is not provided.
 * The script logs an error message and exits if the file does not exist.
 *
 * The script logs a summary message at the end of the script.
 *
 * @module seed_importer
 * @summary Script to import a CSV file into the seat availability table.
 * @example node scripts/seed_importer.js <path-to-csv>
 */
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../src/db');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/seed_importer.js <path-to-csv>');
  process.exit(1);
}

const csvPath = path.resolve(process.argv[2]);
if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found:', csvPath);
  process.exit(1);
}

async function importCSV() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const stream = fs.createReadStream(csvPath).pipe(csv());
    for await (const row of stream) {
      // expected headers: seat_id,event_id,section,row,seat_number,price,status
      const seat_id = row.seat_id || row.id || null;
      const event_id = row.event_id || row.event || null;
      const section = row.section || null;
      const rowVal = row.row || row.r || null;
      const seat_number = row.seat_number || row.number || null;
      const price = row.price ? parseFloat(row.price) : 0.0;
      const status = row.status || 'AVAILABLE';

      if (!seat_id || !event_id) {
        console.warn('skipping row with missing seat_id/event_id', row);
        continue;
      }

      await client.query(
        `INSERT INTO seat_availability(seat_id, event_id, section, row, seat_number, price, status, last_updated)
         VALUES($1,$2,$3,$4,$5,$6,$7,now())
         ON CONFLICT (seat_id) DO UPDATE SET event_id = EXCLUDED.event_id, section = EXCLUDED.section, row = EXCLUDED.row, seat_number = EXCLUDED.seat_number, price = EXCLUDED.price, status = EXCLUDED.status, last_updated = now()`,
        [seat_id, event_id, section, rowVal, seat_number, price, status]
      );
    }
    await client.query('COMMIT');
    console.log('CSV import completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('import failed', err);
  } finally {
    client.release();
  }
}

importCSV();
