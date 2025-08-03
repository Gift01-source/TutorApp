const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  age: Number,
  gender: String,
  bio: String,
  interests: [String],

  image: {
    type: String,
    default: ''
  },

  // GeoJSON location format: { type: 'Point', coordinates: [longitude, latitude] }
  location: {
    type: {
      type: String,
      enum: ['Point'],required:true
    },
    coordinates: {
      type: [Number],
      required:true, // [longitude, latitude] // Enables geospatial queries
    },
    description: String // Optional - e.g., city name
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

 /*messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    } 
  ],*/

  isPremium: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    
  }
});


// Create geospatial index on location
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);