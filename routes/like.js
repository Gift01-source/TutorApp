const express = require('express');
const router = express.Router();
const Like = require('../models/Like'); // Or however you're handling likes

router.post('/like/:id', async (req, res) => {
  const currentUserId = req.session.userId;
  const likedUserId = req.params.id;

  if (!currentUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Save the like in Like collection
    const like = new Like({
      from: currentUserId,
      to: likedUserId
    });
    await like.save();

    // Add liked user to current user's likes array (if not already present)
    const User = require('../models/User');
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { likes: likedUserId } });

    // Add notification to liked user
    await User.findByIdAndUpdate(likedUserId, {
      $push: {
        notifications: {
          type: 'like',
          from: currentUserId,
          date: new Date(),
          read: false
        }
      }
    });

    res.status(200).json({ message: 'Liked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to show users who liked the current user
router.get('/', async (req, res) => {
  const currentUserId = req.session.userId;
  if (!currentUserId) return res.redirect('/login');
  const User = require('../models/User');
  // Find users whose likes array contains the current user
  const likes = await User.find({ likes: currentUserId });
  res.render('likes', { likes });
});

module.exports = router;
