const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /matches
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/dashboard');
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/dashboard');
    }

    const matches = await User.find({ _id: { $in: user.matches || [] } });
    res.render('matches', { matches });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;