const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/:id/like', async(req,res)=>{
   const myId=req.session.userId;
   const likedId=req.params.userId;
   
    const me= await User.findById(myId);
    const likedUser=await User.findById(likedId);

    if (!me.likes.includes(likedId)){
        me.likes.push(likedId);
        await me.save();

      if (!likedIUser.likes.includes(myId)){
        me.matches.push(likedId);
        likedUser.matches.push(myId);
        await likedUser.save(); 
        await me.save();
    }
}
res.redirect('/matches');
});

module.exports=router;