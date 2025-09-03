const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');

// Signup
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: 'Missing fields' });

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ message: err.message });
    const sql = "INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)";
    db.query(sql, [name, email, hash, role], (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'User registered successfully' });
    });
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email=?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length === 0) return res.status(400).json({ message: 'User not found' });

    bcrypt.compare(password, results[0].password, (err, match) => {
      if (err || !match) return res.status(400).json({ message: 'Invalid password' });
      const token = jwt.sign({ id: results[0].id, role: results[0].role, name: results[0].name }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token, role: results[0].role, name: results[0].name, id: results[0].id });
    });
  });
});

// Get all users (protected)
router.get('/users', authMiddleware, (req, res) => {
  const sql = "SELECT id,name,role FROM users";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

module.exports = router;
