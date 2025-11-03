require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = process.argv[2];
if (!token) {
  console.error("Usage: node verifyToken.cjs <token>");
  process.exit(1);
}

try {
  const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key', {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER || 'https://auth.local/',
    audience: process.env.JWT_AUDIENCE || 'payment-service',
  });
  console.log("✅ Token is valid!");
  console.log("Decoded payload:", payload);
} catch (err) {
  console.error("❌ Token verification failed:");
  console.error(err.message);
}
