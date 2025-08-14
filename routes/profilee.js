const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Update path as needed

// GET /profile/:id
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    
    res.render('profile', { user });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
