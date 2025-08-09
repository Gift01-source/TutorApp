const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/dashboard');
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/dashboard');
    }

    res.render('profile', { userId });
  } catch (err) {
    console.error(err);
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
   res.render('/profile');
});

module.exports=router;
