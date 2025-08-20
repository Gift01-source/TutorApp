const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  content: { type: String, required: true },
  image:{type:String},
timestamp:{ type:Date,default:Date.now}
});

module.exports = mongoose.model('Message', MessageSchema);