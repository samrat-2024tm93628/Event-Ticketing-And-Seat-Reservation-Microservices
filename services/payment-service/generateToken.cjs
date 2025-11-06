// generateToken.cjs
require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret  = process.env.JWT_SECRET || 'dev_secret_key';
const issuer  = process.env.JWT_ISSUER || 'https://auth.local/';
const audience = process.env.JWT_AUDIENCE || 'payment-service';

const token = jwt.sign(
  { sub: 'user-15', email: 'alice@example.com', roles: ['payments:write'] },
  secret,
  { algorithm: 'HS256', issuer, audience, expiresIn: '24h' }
);

console.log("\n=== TOKEN ===\n");
console.log(token);
console.log("\n(Use this token in the Authorization header)\n");
console.log("Example curl command:");
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5004/v1/payments/test-protected`);
console.log("\n==============\n");