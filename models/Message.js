const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otherUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  image:{type:String},
timestamp:{ type:Date,default:Date.now}
},{timestamp:Date.true});

module.exports = mongoose.model('Message', MessageSchema);