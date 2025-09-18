const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Middleware to require login
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.render('dashboard', { user: null, users: [] });
  next();
}

// GET settings page
router.get('/',  async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.render('dashboard', { user: null, users: [] });
  res.render('settings', { user });
});

// POST update settings
router.post('/update-settings', async (req, res) => {
  const { displayName, email, bio, password, showProfile, showOnline, emailNotifications, pushNotifications } = req.body;
  const updates = {
    name: displayName,
    email,
    bio,
    showProfile: !!showProfile,
    online: !!showOnline,
    emailNotifications: !!emailNotifications,
    pushNotifications: !!pushNotifications
  };

  try {
    // Hash password if provided
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }
    await User.findByIdAndUpdate(req.session.userId, updates);
    res.render('settings');
  } catch (err) {
    const user = await User.findById(req.session.userId);
    res.render('settings', { user, error: 'Failed to update settings.' });
  }
});

module.exports = router;
