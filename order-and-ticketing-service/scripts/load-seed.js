#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config');
const Order = require('../src/models/Order');
const Ticket = require('../src/models/Ticket');
const logger = require('../src/utils/logger');

// Parse CSV manually (simple implementation)
const parseCSV = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
};

const loadOrders = async (filePath) => {
  try {
    logger.info(`Loading orders from ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);

    if (rows.length === 0) {
      logger.warn('No rows found in CSV');
      return;
    }

    let inserted = 0;
    for (const row of rows) {
      try {
        // Map CSV columns to Order model fields
        const total = parseFloat(row.order_total) || 0;
        const tax = total * 0.05; // Calculate 5% tax

        // Map payment_status: SUCCESS -> PAID, FAILED -> FAILED, PENDING -> PENDING
        let paymentStatus = (row.payment_status || 'PENDING').toUpperCase();
        if (paymentStatus === 'SUCCESS') {
          paymentStatus = 'PAID';
        }

        const order = new Order({
          orderId: row.order_id || `ORD-${Date.now()}-${Math.random()}`,
          userId: row.user_id || 'user-' + Math.random(),
          eventId: row.event_id || 'event-1',
          seats: [], // Seats will be populated from tickets
          total: total,
          tax: parseFloat(tax.toFixed(2)),
          status: (row.status || 'CONFIRMED').toUpperCase(),
          paymentStatus: paymentStatus
        });

        await order.save();
        inserted++;
        logger.info(`Inserted order: ${order.orderId}`);
      } catch (error) {
        // Log detailed error information
        const errorMsg = error.message || JSON.stringify(error);
        const orderId = row.order_id || 'unknown';
        logger.error(`Failed to insert order ${orderId}: ${errorMsg}`);
        if (error.errors) {
          Object.keys(error.errors).forEach(field => {
            logger.error(`  - ${field}: ${error.errors[field].message}`);
          });
        }
      }
    }

    logger.info(`Loaded ${inserted} orders from CSV`);
  } catch (error) {
    logger.error('Error loading orders:', error.message);
    throw error;
  }
};

const loadTickets = async (filePath) => {
  try {
    logger.info(`Loading tickets from ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);

    if (rows.length === 0) {
      logger.warn('No rows found in CSV');
      return;
    }

    let inserted = 0;
    for (const row of rows) {
      try {
        // Map CSV columns to Ticket model fields
        const ticket = new Ticket({
          ticketId: row.ticket_id || `TKT-${Date.now()}-${Math.random()}`,
          orderId: row.order_id,
          eventId: row.event_id || 'event-1',
          seat: row.seat_id,
          price: parseFloat(row.price_paid) || 0,
          issuedAt: new Date()
        });

        await ticket.save();
        inserted++;
        logger.info(`Inserted ticket: ${ticket.ticketId}`);
      } catch (error) {
        // Log detailed error information
        const errorMsg = error.message || JSON.stringify(error);
        const ticketId = row.ticket_id || 'unknown';
        logger.error(`Failed to insert ticket ${ticketId}: ${errorMsg}`);
        if (error.errors) {
          Object.keys(error.errors).forEach(field => {
            logger.error(`  - ${field}: ${error.errors[field].message}`);
          });
        }
      }
    }

    logger.info(`Loaded ${inserted} tickets from CSV`);
  } catch (error) {
    logger.error('Error loading tickets:', error.message);
    throw error;
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  let filePath = null;
  let type = 'orders';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[i + 1];
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1];
      i++;
    }
  }

  if (!filePath) {
    console.error('Usage: node scripts/load-seed.js --file <path> --type <orders|tickets>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(config.mongo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');

    if (type === 'orders') {
      await loadOrders(filePath);
    } else if (type === 'tickets') {
      await loadTickets(filePath);
    } else {
      logger.error(`Unknown type: ${type}`);
      process.exit(1);
    }

    logger.info('Seed loading completed');
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error:', error.message);
    process.exit(1);
  }
};

main();

