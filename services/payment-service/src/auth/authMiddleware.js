// services/payment-service/src/auth/authMiddleware.js
import dotenv from "dotenv";
dotenv.config(); // ensures env vars are loaded even if this file is imported early

import jwt from "jsonwebtoken";

const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = process.env;

function safeDecode(token) {
  try {
    const parts = token.split(".");
    return {
      header: parts[0] ? Buffer.from(parts[0], "base64").toString() : null,
      payload: parts[1] ? Buffer.from(parts[1], "base64").toString() : null,
    };
  } catch (e) {
    return { header: null, payload: null, decodeError: e.message };
  }
}

export function requireAuthHS(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    console.error("Auth header missing");
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const token = auth.split(" ")[1];

  try {
    // const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });



    req.user = payload;
    return next();
  } catch (err) {
    // Detailed debug logging (safe: logs header & payload only, not signature or secret)
    console.error("JWT validation failed:", err && err.message);
    const decoded = safeDecode(token);
    console.error("Decoded token header:", decoded.header);
    console.error("Decoded token payload:", decoded.payload);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    const roles = req.user?.roles || (typeof req.user?.scope === "string" ? req.user.scope.split(" ") : []);
    if (!roles.includes(role)) {
      return res.status(403).json({ error: "Forbidden -insufficient role" });
    }
    next();
  };
}
