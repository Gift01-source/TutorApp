const express = require('express');
const router = express.Router();
const User = require('../models/User');
const isLoggedIn = (req, res, next) => req.session.userId ? next() : res.redirect('/login');

router.get('/', isLoggedIn, async (req, res) => {
  if (!req.session.user || !req.session.user._id) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.user._id).populate('notifications.from notifications.story');
  if (!user) {
    return res.render('notification', { notifications: [] });
  }
  res.render('notification', { notifications: user.notifications });
});

module.exports = router;