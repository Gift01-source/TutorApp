const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

router.get('/', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(400).send('User ID not found in session');
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const chats = await Message.aggregate([
      { $match: { $or: [ { sender: userObjectId }, { receiver: userObjectId } ] } },
      { $sort: { timestamp: -1 } },
      { $group: {
        _id: {
          $cond: [ { $eq: [ "$sender", userObjectId ] }, "$receiver", "$sender" ]
        },
        lastMessage: { $first: "$content" },
        lastTimestamp: { $first: "$timestamp" },
        unreadCount: { $sum: { $cond: [ { $and: [ { $eq: [ "$receiver", userObjectId ] }, { $eq: [ "$read", false ] } ] }, 1, 0 ] } }
      }},
      { $limit: 50 }
    ]);

    // Fetch user details and online status
    const chatUsers = await Promise.all(chats.map(async chat => {
      const otherUser = await User.findById(chat._id);
      return {
        id: otherUser._id,
        name: otherUser.name,
        profileImage: otherUser.image || '/images/default.png',
        online: otherUser.online || false,
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadCount || 0
      };
    }));

    res.render('chatList', { chatUsers });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading chat list');
  }
});


router.post('/chat/:otherUserId', requireLogin, async (req, res) => {
  const senderId = req.session.userId;
  const receiverId = req.params.otherUserId;
  const content = req.body.content;

  if (!content || content.trim() === '') {
    return res.status(400).send('Message cannot be empty');
  }

  try {
    await Message.create({
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      timestamp: new Date()
    });

    res.redirect(`/chat/${receiverId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to send message');
  }
});

module.exports=router;