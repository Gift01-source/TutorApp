const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /profile
router.get('/profile1', async (req, res) => {
  try {
    console.log('--- /profile1 route hit ---');
    console.log('Session:', req.session);
    if (!req.session.userId) {
      console.log('No userId in session. Redirecting to dashboard.');
  return res.render('dashboard', { user: null, users: [] });
    }

    const user = await User.findById(req.session.userId);
    console.log('Loaded user for profile1:', user);
    if (!user) {
      console.log('User not found. Redirecting to dashboard.');
  return res.render('dashboard', { user: null, users: [] });
    }

    res.render('profile1', { profileuser: user });
  } catch (err) {
    console.error('Error in /profile1:', err);
    res.status(500).send('Server error');
  }
});

const multer = require('multer');
const path = require('path');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  })
});

// GET edit profile form
router.get('/profile1/edit', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = await User.findById(req.session.userId);
  res.render('editProfile', { user });
});

// POST edit profile
router.post('/profile1/edit', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    const { name, age, gender, bio, interests, hobbies, religion, preferredGender, location, phone } = req.body;
    const update = {
      name,
      age,
      gender,
      bio,
      interests: interests ? interests.split(',').map(i => i.trim()) : [],
      hobbies: hobbies ? hobbies.split(',').map(h => h.trim()) : [],
      religion,
      preferredGender,
      location,
      phone
    };
    if (req.file) {
      update.image = '/uploads/' + req.file.filename;
    }
    await User.findByIdAndUpdate(req.session.userId, update);
    const user = await User.findById(req.session.userId);
    res.render('profile1', { profileuser: user });
  } catch (err) {
  console.error('Edit profile error:', err);
  const user = await User.findById(req.session.userId);
  res.render('editProfile', { user, error: 'Server error: ' + err.message });
  }
});

module.exports=router;
