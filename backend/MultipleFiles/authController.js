// MultipleFiles/authController.js
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'parent_teacher_secret';
// Signup
exports.signup = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)";
    db.query(sql, [name, email, hash, role], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Email may already exist' });
      }
      res.json({ message: 'User registered successfully', id: result.insertId });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login
exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const sql = "SELECT * FROM users WHERE email=?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results || results.length === 0) return res.status(400).json({ message: 'User not found' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid password' });
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, id: user.id, name: user.name, role: user.role });
  });
};
