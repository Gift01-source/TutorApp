// models/Like.js
const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Like', likeSchema);
