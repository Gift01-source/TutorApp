const express = require('express');
const router = express.Router();
const Like = require('../models/Like'); // Or however you're handling likes

router.post('/like/:id', async (req, res) => {
  const currentUserId = req.session.user;
  const likedUserId = req.params.id;

  if (!currentUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Save the like
    const like = new Like({
      from: currentUserId,
      to: likedUserId
    });
    await like.save();

    res.status(200).json({ message: 'Liked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
