const express = require('express');
const router = express.Router();
const User = require('../models/User');

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/dashboard');
  }
}

// Route to view another user's profile
router.get('/profile/:id', requireLogin, async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id);
    if (!profileUser) {
      return res.status(404).send('User not found');
    }
    res.render('profile', { profileUser });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;