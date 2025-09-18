const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to ensure user is authenticated
function isLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// POST /api/location - update user location
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

router.post('/location', isLoggedIn, async (req, res) => {
  const { latitude, longitude } = req.body;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  let city = '';
  try {
    // Reverse geocode using OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'TutorApp/1.0' } });
    if (response.ok) {
      const data = await response.json();
      if (data.address) {
        city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district || data.address.state || data.address.region || '';
      }
    }
  } catch (err) {
    // If geocoding fails, just leave city blank
    city = '';
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.session.userId,
      {
        $set: {
          location: { type: 'Point', coordinates: [longitude, latitude] },
          city: city
        }
      },
      { new: true }
    );
    res.json({ success: true, location: user.location, city: user.city });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
