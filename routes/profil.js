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

router.get('edit',async(req,res)=>{
    const user=await User.findById(req.session.userId);
   res.render('editProfile',{user});
});

router.get('edit',async(req,res)=>{
    const {name,age,gender,bio,interests,profilePicture}=req.body;
    await User.findByIdAndUpdate(req.session.userId,{
        name,age,gender,bio,
        interests:interests.split(',').map(i=>i.trim()),
        profilePicture
    });
   res.render('profile1', { profileuser: user });
});

module.exports=router;
