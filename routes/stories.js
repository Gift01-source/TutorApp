const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');
const isLoggedIn = (req, res, next) => req.session.userId ? next() : res.redirect('/login');

// GET all stories
router.get('/', async (req, res) => {
  const stories = await Story.find().sort({ createdAt: -1 });
  res.render('stories', { stories, error: null, success: null, user: req.session.userId });
});

// POST new story
router.post('/', isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  await Story.create({
    title,
    content,
  author: req.session.userId,
  authorName: req.session.userId // You may want to fetch the user object if needed
  });
  res.redirect('/stories');
});

// POST comment
router.post('/:id/comment', isLoggedIn, async (req, res) => {
  const story = await Story.findById(req.params.id);
  story.comments.push({
    author: req.session.user._id,
    authorName: req.session.user.name,
    content: req.body.comment
  });
  await story.save();
  res.redirect('/stories');
});

// GET edit story page
router.get('/:id/edit', isLoggedIn, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story || story.author.toString() !== req.session.user._id) return res.redirect('/stories');
  res.render('edit-story', { story });
});

// POST edit story
router.post('/:id/edit', isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  const story = await Story.findById(req.params.id);
  if (story.author.toString() === req.session.user._id) {
    story.title = title;
    story.content = content;
    await story.save();
  }
  res.redirect('/stories');
});

// POST delete story
router.post('/:id/delete', isLoggedIn, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (story.author.toString() === req.session.user._id) {
    await Story.deleteOne({ _id: req.params.id });
  }
  res.redirect('/stories');
});

// Like a story
router.post('/:id/like', isLoggedIn, async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (!story.likes.includes(req.session.user._id)) {
    story.likes.push(req.session.user._id);
    await story.save();
    // Notification: add to author's notifications array (if you have one)
    if (story.author && story.author.toString() !== req.session.user._id) {
      await User.findByIdAndUpdate(story.author, {
        $push: { notifications: { type: 'like', from: req.session.user._id, story: story._id, date: new Date() } }
      });
    }
  }
  res.redirect('/stories');
});

// Unlike a story
router.post('/:id/unlike', isLoggedIn, async (req, res) => {
  const story = await Story.findById(req.params.id);
  story.likes = story.likes.filter(id => id.toString() !== req.session.user._id);
  await story.save();
  res.redirect('/stories');
});

router.post('/:id/comment', isLoggedIn, async (req, res) => {
  const story = await Story.findById(req.params.id);
  story.comments.push({
    author: req.session.user._id,
    authorName: req.session.user.name,
    content: req.body.comment
  });
  await story.save();

  // Add notification for story author (if not commenting on own story)
  if (story.author && story.author.toString() !== req.session.user._id) {
    await User.findByIdAndUpdate(story.author, {
      $push: {
        notifications: {
          type: 'comment',
          from: req.session.user._id,
          story: story._id,
          date: new Date(),
          read: false
        }
      }
    });
  }

  res.render('stories');
});


module.exports = router;