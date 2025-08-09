const User = require('../models/User');
const Message = require('../models/Message');

async function getUserChats(userId) {
  const messages = await Message.find({
    $or: [{ from: userId }, { to: userId }]
  }).sort({ timestamp: -1 });

  const conversationsMap = new Map();

  for (const msg of messages) {
    const otherUserId = msg.from.toString() === userId.toString() ? msg.to.toString() : msg.from.toString();

    if (!conversationsMap.has(otherUserId)) {
      conversationsMap.set(otherUserId, msg);
    }
  }

  const otherUserIds = Array.from(conversationsMap.keys());
  const otherUsers = await User.find({ _id: { $in: otherUserIds } });

  return otherUsers.map(user => ({
    user,
    lastMessage: conversationsMap.get(user._id.toString())
  }));
}

module.exports = { getUserChats };