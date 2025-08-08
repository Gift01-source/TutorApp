const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// POST /messages - send a new message
router.post('/', async (req, res) => {
  try {
    const sender = req.user._id; // from auth middleware
    const { receiver, text } = req.body;
    if (!receiver || !text) {
      return res.status(400).json({ error: 'Receiver and text required' });
    }
    const message = await Message.create({ sender, receiver, text });
    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;