
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

async function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
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
const mongoose = require('mongoose');
router.get('/:otherUserId', isLoggedIn, async (req, res) => {
  const { otherUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
    return res.status(400).send('Invalid user ID');
  }
  try {
    const otherUser = await User.findById(otherUserId);
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
    const senderId = req.user._id;           // get from req.user, not req.user directly
    const receiverId = req.params.userId;
    const content = req.body.content;

    if (!content || !receiverId) {
      return res.status(400).send('Missing message content or receiver');
    }

    await Message.create({ sender: senderId, receiver: receiverId, content, timestamp: new Date() });
    res.redirect(`/chat/${receiverId}`);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).send('Failed to send message');
  }
});

module.exports = router;


/*const express = require('express');
const path = require('path');
const multer = require('multer');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();

// Multer storage (store in public/uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET message thread page (renders chat.ejs)
router.get('/:id', async (req, res) => {
  try {
  if (!req.session || !req.session.userId) return res.redirect('/login');
    const otherUserId = req.params.id;
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) return res.status(404).send('User not found');

    const messages = await Message.find({
      $or: [
  { sender: req.session.userId, receiver: otherUserId },
  { sender: otherUserId, receiver: req.session.userId }
      ]
    }).sort({ createdAt: 1 });

    res.render('chat', {
      otherUser,
      messages,
  currentUser: req.user
    });
  } catch (err) {
    console.error('Load thread error:', err);
    res.status(500).send('Could not load messages');
  }
});

// POST send message (text or image)
router.post('/:id', upload.single('image'), async (req, res) => {
  try {
  if (!req.session || !req.session.userId) return res.redirect('/login');
    const receiverId = req.params.id;
    const content = req.body.content?.trim() || null;
    const imagePath = req.file ? '/uploads/${req.file.filename}' : null;

    if (!content && !imagePath) {
      return res.status(400).send('Empty message');
    }

    await Message.create({
  sender: req.session.userId,
      receiver: receiverId,
      content,
      image: imagePath
    });

    // (Optional) You could emit an event via socket.io here to update live clients
    res.redirect('/message/${receiverId}');
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).send('Could not send message');
  }
});

router.post('/chat/:otherUserId', async (req, res) => {
  const senderId = req.session.userId;
  const receiverId = req.params.otherUserId;
  const content = req.body.content;

  if (!senderId || !receiverId) {
    return res.status(400).send('Sender and receiver are required.');
  }

  const newMessage = new Message({
    sender: senderId,
    receiver: receiverId,
    content: content,
    timestamp: new Date()
  });

  try {
    await newMessage.save();
    res.redirect(`/chat/${receiverId}`);
  } catch (err) {
    res.status(500).send('Failed to send message.');
  }
});

module.exports = router;*/