//check this. make sure after step 1 it directs to veriffy // routes/register.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');


// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Nodemailer transporter (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user:"bae23-gchimwaza@poly.ac.mw",
    pass:"docizuczxzoznfoj"
    
  }
});


// helper: 6-digit code
function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//helper fo phone
function formatPhoneNumber(number){
 if(!number)return'';
 let digits=number.replace(/\D/g,'');
    if(digits.startsWith('0')) digits=digits.slice(1);
    return '+265' + digits;
}
// --- Step 1: show registration form
router.get('/register-step1', (req, res) => {
  // Prefill with session or partial user data if available
  let email = '', phone = '';
  if (req.session.registrationData) {
    email = req.session.registrationData.email || '';
    phone = req.session.registrationData.phone || '';
  }
  res.render('register-step1', { error: null, email, phone });
});

// Step 1: submit email/password (+ optional phone) -> create user (pending) and send code via email and SMS
router.post('/register-step1', async (req, res) => {
  const { email, password, confirm, phone } = req.body;
  if (!email || !password || !confirm) {
    return res.render('register-step1', { error: 'All fields required', email, phone });
  }
  if (password !== confirm) return res.render('register-step1', { error: 'Passwords do not match', email, phone });

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.isComplete) {
        // User is fully registered, block
        return res.render('register-step1', { error: 'Email already registered', email, phone });
      } else {
        // User is incomplete, allow resume: update password if changed, update phone if provided
        const formattedPhone = phone ? formatPhoneNumber(phone) : existing.phone;
        const passwordHash = await bcrypt.hash(password, 10);
        existing.passwordHash = passwordHash;
        if (phone) existing.phone = formattedPhone;
        // Generate new code for verification
        const code = makeCode();
        const expires = Date.now() + 60 * 60 * 1000;
        existing.verificationCode = code;
        existing.codeExpires = expires;
        await existing.save();
        req.session.registrationData = {
          email,
          passwordHash,
        };
        req.session.pendingUserId = existing._id;
        // Send code via email
        const mailOptions = {
          from: `bae23-gchimwaza@gmail.com`,
          to: email,
          subject: 'Your PaKoNa Meet verification code',
          text: `Your code: ${code}`,
          html:` <p>Your PaKoNa Meet verification code is <strong>${code}</strong></p>`
        };
        await transporter.sendMail(mailOptions).catch(err => console.error('Mail send error', err));
        return res.redirect('/verify-code');
      }
    }

    // No user exists, create new
    const formattedPhone = phone ? formatPhoneNumber(phone) : undefined;
    const passwordHash = await bcrypt.hash(password, 10);
    const code = makeCode();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    const user = new User({
      email,
      phone: formattedPhone,
      passwordHash,
      isVerified: false,
      verificationCode: code,
      codeExpires: expires,
      isComplete: false
    });
    await user.save();
    req.session.registrationData = {
      email,
      passwordHash,
      isVerified: false,
    };
    req.session.pendingUserId = user._id;

    // Send email
    const mailOptions = {
      from: `bae23-gchimwaza@gmail.com`,
      to: email,
      subject: 'Your PaKoNa Meet verification code',
      text: `Your code: ${code}`,
      html:` <p>Your PaKoNa Meet verification code is <strong>${code}</strong></p>`
    };
    await transporter.sendMail(mailOptions).catch(err => console.error('Mail send error', err));

    res.redirect('/verify-code');
  } catch (err) {
    console.error(err);
    res.render('register-step1', { error: 'Server error, try again', email, phone });
  }
});

// GET verify page
router.get('/verify-code', (req, res) => {
  if (!req.session.registrationData) return res.redirect('/register-step1');
  res.render('verify-code', { error: null });
});

// POST verify code
router.post('/verify-code', async (req, res) => {
  const { code } = req.body;
  const pendingUserId = req.session.pendingUserId;
  if (!pendingUserId) return res.redirect('/register-step1');

  try {
    const user = await User.findById(pendingUserId);
    if (!user) return res.redirect('/register-step1');

    if (!user.verificationCode || user.verificationCode !== code) {
      return res.render('verify-code', { error: 'Invalid code' });
    }
    if (user.codeExpires < Date.now()) {
      return res.render('verify-code', { error: 'Code expired. Click resend.' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    await user.save();

    // Log the user in
    req.session.userId = user._id;
    delete req.session.pendingUserId;

    console.log('Setting userId in session:',user._id);

    res.redirect('/register-step3');
  } catch (err) {
    console.error(err);
    res.render('verify-code', { error: 'Server error' });
  }
});

// Resend code (POST)
router.post('/resend-code', async (req, res) => {
  const pendingId = req.session.pendingUserId;
  if (!pendingId) return res.redirect('/register-step1');
  try {
    const user = await User.findById(pendingId);
    if (!user) return res.redirect('/register-step1');

    const code = makeCode();
    user.verificationCode = code;
    user.codeExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    // send both
    await transporter.sendMail({
      from:` bae23-gchimwaza@poly.ac.mw`,
      to: user.email,
      subject: 'Your new SoulSwipe verification code',
      text: `Your code: ${code}`,
      html: `<p>Your SoulSwipe verification code is <strong>${code}</strong></p>`
    }).catch(err => console.error('Mail send error', err));


    res.render('verify-code', { error: 'New code sent' });
  } catch (err) {
    console.error(err);
    res.render('verify-code', { error: 'Could not resend code' });
  }
});

/*
  Step 3: Basic details (age, gender, religion)
*/
router.get('/register-step3', async (req, res) => {
  if (!req.session.userId) return res.redirect('/register-step1');
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/register-step1');
  console.log('session userId in session:',req.session.userId);
  res.render('register-step3', { error: null, user });
});

router.post('/register-step3', async (req, res) => {
  if (!req.session.userId) return res.redirect('/register-step1');
  const { age, gender, religion } = req.body;
  if ( !age || !gender) return res.render('register-step3', { error: 'Age and gender required' });
  if (Number(age) < 18) return res.render('register-step3', { error: 'You must be 18+' });
  try {
    await User.findByIdAndUpdate(req.session.userId, { age: Number(age), gender, religion });
    res.redirect('/register-step4');
  } catch (err) {
    console.error(err);
    res.render('register-step3', { error: 'Could not save details' });
  }
});

/*
  Step 4: Interests (choose at least 5) + image upload
*/
const INTERESTS = [
  'Music', 'Movies', 'Sports', 'Travel', 'Food', 'Fitness', 'Reading',
  'Gaming', 'Art', 'Photography', 'Dancing', 'Technology', 'Nature',
  'Pets', 'Cooking', 'Fashion', 'Politics', 'Science', 'Outdoors'
];

router.get('/register-step4', (req, res) => {
  if (!req.session.userId) return res.redirect('/register-step1');
  res.render('register-step4', { error: null, interests: INTERESTS });
});

// upload.single('image') handles profile image
router.post('/register-step4', upload.single('image'), async (req, res) => {
  if (!req.session.userId) return res.redirect('/register-step1');
  try {
    let { hobbies } = req.body;
    // hobbies comes as array (checkboxes) or comma string
    if (!hobbies) hobbies = [];
    if (typeof hobbies === 'string') {
      hobbies = hobbies.split(',').map(h => h.trim()).filter(Boolean);
    }
    // ensure min 5 picks
    if (!Array.isArray(hobbies) || hobbies.length < 5) {
      return res.render('register-step4', { error: 'Please select at least 5 interests', interests: INTERESTS });
    }

    const update = { hobbies };
    if (req.file) {
      update.image = '/uploads/' + req.file.filename;
    }

    await User.findByIdAndUpdate(req.session.userId, update);
    res.redirect('/register-step5');
  } catch (err) {
    console.error('Step4 error:', err);
    res.render('register-step4', { error: 'Could not save interests/image', interests: INTERESTS });
  }
});

/*
  Step 5: Preferences (preferred gender) and finish
*/
router.get('/register-step5', (req, res) => {
  if (!req.session.userId) return res.redirect('/register-step1');
  res.render('register-step5', { error: null });
});

router.post('/register-step5', async (req, res) => {
  if (!req.session.userId) return res.redirect('/register-step1');
  try {
    const { preferredGender, name } = req.body;
    await User.findByIdAndUpdate(req.session.userId, { preferredGender, name, isComplete: true });
    // registration complete
    // Fetch user with latest data (including image)
    const user = await User.findById(req.session.userId);
    // Fetch all other users to show on dashboard
    const users = await User.find({ _id: { $ne: req.session.userId } });
    res.render('dashboard', { user, users });
  } catch (err) {
    console.error('Step5 error:', err);
    res.render('register-step5', { error: 'Could not save preferences' });
  }
});

module.exports = router;
