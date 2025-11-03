import dotenv from "dotenv"; 
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import { requireAuthHS, requireRole } from "./src/auth/authMiddleware.js";
import pg from "pg";
import { v4  as uuidv4} from "uuid";
import pool from "./src/db/dbClient.js";




const app = express();
const PORT = process.env.PORT || 5004;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
    res.send("Payment Service is running");
});

// Dev-only: decode JWT payload (DO NOT USE IN PROD)
// Dev-only: decode JWT payload (no signature verification)
app.get("/v1/debug/decode-token", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(400).json({ error: "Missing Authorization: Bearer <token>" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return res.status(200).json({ decoded: payload });
  } catch (e) {
    return res.status(400).json({ error: "Unable to decode token", detail: e.message });
  }
});



// Protected route example
app.get("/v1/payments/test-protected", requireAuthHS, requireRole("payments:write"), (req, res) => {
  res.status(200).json({
    message: "Access granted to protected route",
    user: req.user,
  });
});

// =========================
// POST /v1/payments/charge
// =========================
app.post(
  "/v1/payments/charge",
  requireAuthHS,
  requireRole("payments:write"),
  async (req, res) => {
    const { order_id, amount, method, idempotency_key } = req.body;
    const userId = req.user.sub;

    if (!order_id || !amount || !method || !idempotency_key) {
      return res
        .status(400)
        .json({ error: "Missing order_id, amount, method or idempotency_key" });
    }

    try {
      // Check idempotency
      const existing = await pool.query(
        "SELECT response FROM idempotency_keys WHERE key=$1 AND user_id=$2",
        [idempotency_key, userId]
      );
      if (existing.rowCount > 0) {
        console.log("Duplicate idempotent request, returning cached response");
        return res.status(200).json(existing.rows[0].response);
      }

      // Simulate payment gateway
      const success = Math.random() > 0.2; // 80% success rate
      const status = success ? "SUCCESS" : "FAILED";
      const reference = "TXN-" + uuidv4().slice(0, 8);

      const result = await pool.query(
        `INSERT INTO payments (order_id, amount, method, status, reference)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [order_id, amount, method, status, reference]
      );

      const payment = result.rows[0];

      // Store idempotency record
      await pool.query(
        `INSERT INTO idempotency_keys (key, user_id, response)
         VALUES ($1,$2,$3)`,
        [idempotency_key, userId, payment]
      );

      console.log(`✅ Payment processed for Order ${order_id}, Status: ${status}`);
      res.status(200).json(payment);
    } catch (err) {
      console.error(" Payment error:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// =========================
// GET /v1/payments/:id
// =========================
app.get("/v1/payments/:id", requireAuthHS, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM payments WHERE payment_id=$1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Payment not found" });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// POST /v1/payments/refund
// =========================
app.post("/v1/payments/refund", requireAuthHS, requireRole("payments:write"), async (req, res) => {
  const { payment_id } = req.body;
  try {
    const result = await pool.query("SELECT * FROM payments WHERE payment_id=$1", [payment_id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Payment not found" });

    const updated = await pool.query(
      "UPDATE payments SET status='REFUNDED' WHERE payment_id=$1 RETURNING *",
      [payment_id]
    );

    res.status(200).json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// temporary debugging route – remove later
app.get("/debug/env", (req, res) => {
  res.json({
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE
  });
});

app.get("/debug/header", (req, res) => {
  res.json({ authorization: req.headers.authorization });
});



app.listen(PORT, () => {
    console.log(`Payment Service is running on port ${PORT}`);
});