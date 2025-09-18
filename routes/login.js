const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// GET login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { error: 'Email and password required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    if (!user.isVerified) {
      return res.render('login', { error: 'Please verify your email before logging in.' });
    }
  req.session.userId = user._id;
  req.session.user = {
    _id: user._id,
    name: user.name,
    email: user.email,
    image: user.image || '',
    isPremium: user.isPremium || false
  };
  // Fetch all other users to show on dashboard
  const users = await User.find({ _id: { $ne: user._id } });
  res.render('dashboard', { user, users });
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Server error' });
  }
});

// GET logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
