const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Kenyan counties and sub-counties
const kenyaLocations = require('../data/kenyaLocations');

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, user_type, phone, county, sub_county } = req.body;
  
  try {
    // Check if user exists
    const [user] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (user.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await db.query(
      'INSERT INTO users (username, email, password, user_type, phone, county, sub_county) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, user_type, phone, county, sub_county]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (user.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user[0].user_id, user_type: user[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: {
        id: user[0].user_id,
        username: user[0].username,
        email: user[0].email,
        user_type: user[0].user_type,
        county: user[0].county,
        sub_county: user[0].sub_county
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Kenyan locations
router.get('/locations', (req, res) => {
  res.json(kenyaLocations);
});

module.exports = router;