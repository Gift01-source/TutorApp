const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  // Use only one field to store hashed password
  passwordHash: {
    type: String,
    required: true
  },

  phone: {
    type: String
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationCode: String,

  age: Number,

  gender: String,

  bio: String,

  religion: String,

  hobbies: {
    type: [String],  // store as array of strings instead of single string
    default: []
  },

  preferredGender: String, // fixed typo from 'preferedGender'

  interests: {
    type: [String],
    default: []
  },
  location:String,//{type:{type:String},coordinates:[Number]},
  profileImage:String,
  isOnline:Boolean,
  //likes:[ObjectId],

  image: {
    type: String,
    default: ''
  },
  online:{
    type:Boolean,
    default:false
  },

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  matches: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  isPremium: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  resetPasswordToken: String,

  resetPasswordExpire: Date
});

// Optional geospatial location (commented out, can add later)
 userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);