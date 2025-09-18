const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Report model (simple schema for demonstration)
const reportSchema = new mongoose.Schema({
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  details: String,
  date: { type: Date, default: Date.now }
});
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

// Multer setup for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- ADMIN AUTH ---
router.get('/admin/login', (req, res) => {
  res.send('<form method="POST" style="max-width:400px;margin:50px auto;padding:20px;border:2px solid #4CAF50;border-radius:8px;background-color:#222;color:#fff;font-family:Arial,sans-serif"><h2>Admin Login</h2><input type="password" name="password" placeholder="Admin password" style="width:100%;padding:8px;margin:10px 0;border-radius:4px;border:1px solid #888;"><button type="submit" style="background:#4CAF50;color:#fff;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;">Login</button></form>');
});

router.post('/admin/login', (req, res) => {
  if (req.body.password === 'admin123') {
    req.session.isAdmin = true;
    res.redirect('/admin/reports');
  } else {
    res.send('<div style="max-width:400px;margin:50px auto;padding:20px;border:2px solid #f44336;border-radius:8px;background-color:#ffd6d6;color:#b71c1c;font-family:Arial,sans-serif"><h2>Login Failed</h2><p>Incorrect password.</p><a href="/admin/login" style="color:#4CAF50;text-decoration:none;font-weight:bold;">Try Again</a></div>');
  }
});

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(403).send('Forbidden: Admins only');
}

router.get('/admin/reports', isAdmin, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedUser', 'name email')
      .populate('reporter', 'name email')
      .sort({ date: -1 });
    res.render('admin-reports', { reports });
  } catch (err) {
    res.status(500).send('Could not load reports.');
  }
});

// --- USER REPORTING ---
router.get('/report/:id', async (req, res) => {
  const reportedUser = await User.findById(req.params.id);
  if (!reportedUser) return res.status(404).send('User not found');
  res.render('report', { reportedUser });
});

router.post('/report/:id', async (req, res) => {
  if (!req.session || (!req.session.user && !req.session.userId)) return res.redirect('/login');
  const reporterId = req.session.user && req.session.user._id ? req.session.user._id : req.session.userId;
  try {
    await Report.create({
      reportedUser: req.params.id,
      reporter: reporterId,
      reason: req.body.reason,
      details: req.body.details
    });
    res.send('<div style="max-width:400px;margin:50px auto;padding:20px;border:2px solid #4CAF50;border-radius:8px;background-color:#dff0d8;color:#3c763d;font-family:Arial,sans-serif"><h2>Report Submitted</h2><p>Thank you for helping keep the community safe.</p><a href="/dashboard" style="color:#4CAF50;text-decoration:none;font-weight:bold;">Back to Dashboard</a></div>');
  } catch (err) {
    res.status(500).send('Could not submit report.');
  }
});

// --- PROFILE EDITING ---
function isLoggedIn(req, res, next) {
  if (
    (req.session && req.session.user && req.session.user._id) ||
    (req.session && req.session.userId)
  ) {
    return next();
  }
  res.redirect('/login');
}

router.get('/profile/edit', isLoggedIn, async (req, res) => {
  const userId = req.session.user && req.session.user._id ? req.session.user._id : req.session.userId;
  const user = await User.findById(userId);
  if (!user) return res.redirect('/login');
  res.render('edit-profile', { user });
});

router.post('/profile/edit', isLoggedIn, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.session.user && req.session.user._id ? req.session.user._id : req.session.userId;
    const updateData = {
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      bio: req.body.bio,
      interests: req.body.interests ? req.body.interests.split(',').map(i => i.trim()) : [],
    };
    if (req.file) {
      updateData.image = req.file.filename;
    }
    await User.findByIdAndUpdate(userId, updateData);
    res.redirect(`/profile/${userId}`);
  } catch (err) {
    res.status(500).send('Profile update failed');
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    res.render('profile', { user });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;