const jwt = require('jsonwebtoken');

const secret = '***REMOVED_JWT_SECRET***';
const payload = {
  id: 1,
  username: 'admin',
  profile: 'admin',
  tenantId: '0d038f28-27a7-481f-bd6c-a2ee8ea5aaed',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
};

const token = jwt.sign(payload, secret);
console.log(token);
