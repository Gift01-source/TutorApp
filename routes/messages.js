const express = require('express');
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
        { sender: req.session.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.session.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.render('chat', {
      otherUser,
      messages,
      currentUser: req.session.user
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
      sender: req.session.user._id,
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
  const senderId = req.session.user._id;
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

module.exports = router;