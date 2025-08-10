const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  Content: { type: String, required: true },
  image:{type:String},
timestamp:{ type:Date,default:Date.now}
});

module.exports = mongoose.model('Message', MessageSchema);