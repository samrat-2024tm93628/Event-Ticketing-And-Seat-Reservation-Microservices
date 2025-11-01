/**
 * 
 * @module db
 * @summary Connects to PostgreSQL database using pg module
 * @description This module exports a query function and a getClient function to interact with the PostgreSQL database.
 * It uses a connection pool to manage database connections efficiently.
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/reservationdb'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
