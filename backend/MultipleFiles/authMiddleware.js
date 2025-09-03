const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'parent_teacher_secret'; // match authController

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized: Missing token' });
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Unauthorized: Invalid format' });
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
}

module.exports = { authMiddleware, SECRET_KEY };