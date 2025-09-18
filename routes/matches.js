const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /matches
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
  return res.render('dashboard', { user: null, users: [] });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
  return res.render('dashboard', { user: null, users: [] });
    }

    // Parse location as number (assuming it's stored as a string of km)
    const userLocation = parseFloat(user.location) || 0;
    const userInterests = user.interests || [];

    // Find users with similar interests and nearest location (excluding self)
    let candidates = await User.find({
      _id: { $ne: user._id },
      interests: { $in: userInterests },
      location: { $exists: true, $ne: null }
    });

    // Score by number of shared interests and proximity
    candidates = candidates.map(u => {
      const otherLocation = parseFloat(u.location) || 0;
      const sharedInterests = u.interests.filter(i => userInterests.includes(i));
      return {
        ...u.toObject(),
        distance: Math.abs(userLocation - otherLocation),
        sharedInterestsCount: sharedInterests.length
      };
    });

    // Sort by most shared interests, then nearest location
    candidates.sort((a, b) => {
      if (b.sharedInterestsCount !== a.sharedInterestsCount) {
        return b.sharedInterestsCount - a.sharedInterestsCount;
      }
      return a.distance - b.distance;
    });

  res.render('matches', { matches: candidates });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;