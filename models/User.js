const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: String, // 'like', 'comment', etc.
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  city: {
    type: String,
    default: ''
  },
  profileImage:[String],
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

  // Registration completion flag
  isComplete: {
    type: Boolean,
    default: false
  },
  emailNotification: { type: Boolean, default: true },
  pushNotification: { type: Boolean, default: true },

  createdAt: {
    type: Date,
    default: Date.now
  },
  

  resetPasswordToken: String,

  resetPasswordExpire: Date,

  notifications: [notificationSchema]
});

// Geospatial index for location
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);