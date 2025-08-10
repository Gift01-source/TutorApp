const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

async function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    try {
      const user = await User.findById(req.session.user);
      if (!user) {
        return res.redirect('/login');
      }
      req.user = user;
      next();
    } catch (err) {
      console.error(err);
      return res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
}

// Get chat page with a specific user
router.get('/:otherUserId', isLoggedIn, async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.otherUserId);
    if (!otherUser) return res.status(404).send('User not found');

    const currentUser = req.user;  // full user object from middleware

    const messages = await Message.find({
      $or: [
        { sender: currentUser._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: currentUser._id }
      ]
    }).sort({ timestamp: 1 });

    res.render('chat', {
      user: currentUser,  // pass full user object
      otherUser,
      messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading chat');
  }
});

// Send message API
router.post('/:userId', isLoggedIn, async (req, res) => {
  try {
    const senderId = req.user._id;      // fix: get _id property
    const receiverId = req.params.userId;
    const content = req.body.content;

    await Message.create({ sender: senderId, receiver: receiverId, content, timestamp: new Date() });
    res.redirect(`/chat/${receiverId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to send message');
  }
});

module.exports = router;