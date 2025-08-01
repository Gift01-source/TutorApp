const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const User = require('./models/User');
const Message = require('./models/Messages');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads',express.static(path.join(__dirname,'uploads')));



app.use(session({
    secret: 'soulswipe_secret',
    resave: false,
    saveUninitialized: true
}));

// MongoDB Connection
mongoose.connect('mongodb+srv://gift:2002@cluster0.i8kqrfw.mongodb.net/SoulSwipe?retryWrites=true&w=majority')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Routes

// Home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { name, email, password, gender, age, bio } = req.body;

        if (!email || !password || !name) {
            return res.status(400).send("Name, email and password are required.");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already registered. Please log in.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            gender,
            age,
            bio,
            image: req.file ? req.file.filename : 'default.jpg'
        });

        await newUser.save();
        res.send('Registration successful! You can now <a href="/login">Login</a>.');
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send('Server error during registration.');
    }
});

// Login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).send('Invalid email.');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send('Invalid password.');

        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error during login.');
    }
});

// Dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const query = req.query.q || '';
  const regex = new RegExp(query, 'i');

  try {
    const users = await User.find({
      _id: { $ne: req.session.user._id },
      $or: [
        { name: regex },
        { email: regex }
      ]
    });

    const me = await User.findById(req.session.user._id);
    const likedBy = await User.find({ likes: req.session.user._id });

    res.render("dashboard", {
      user: req.session.user,
      users,
      likedBy,
      query
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading users.');
  }
});

//Get messages
// GET message thread with a user
app.get('/message/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const otherUserId = req.params.id;
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.session.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.session.user._id }
      ]
    }).sort({ timestamp: 1 });

    const otherUser = await User.findById(otherUserId);

    res.render('message', {
      user: req.session.user,
      otherUser,
      messages
    });
  } catch (err) {
    console.error('Error loading messages:', err);
    res.status(500).send('Could not load messages');
  }
});

// POST new message
app.post('/message/:id', async (req, res) => {
  const receiverId = req.params.id;
  const { content } = req.body;

  try {
    await Message.create({
      sender: req.session.user._id,
      receiver: receiverId,
      content,
      timestamp: new Date()
    });

    res.redirect('/message/' + receiverId);
  } catch (err) {
    console.error('Message sending error:', err);
    res.status(500).send('Message send failed');
  }
});

//message id
app.post('/send-message/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    const newMessage = new Message({
      sender: req.session.user._id,
      recipient: req.params.id,
      content: req.body.message
    });

    await newMessage.save();
    res.redirect('/message/${req.params.id}');
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).send('Message failed');
  }
});

// Edit message (only if user is sender)
app.post('/message/:id/edit', async (req, res) => {
  const msgId = req.params.id;
  const { content } = req.body;

  try {
    const message = await Message.findById(msgId);
    if (!message || !message.sender.equals(req.session.user._id)) {
      return res.status(403).send('Unauthorized');
    }

    message.content = content;
    await message.save();

    res.redirect('/profile/' + message.receiver);
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).send('Could not edit message');
  }
});

// Delete message (only if user is sender)
app.post('/message/:id/delete', async (req, res) => {
  const msgId = req.params.id;

  try {
    const message = await Message.findById(msgId);
    if (!message || !message.sender.equals(req.session.user._id)) {
      return res.status(403).send('Unauthorized');
    }

    const receiverId = message.receiver;
    await message.remove();

    res.redirect('/profile/' + receiverId);
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).send('Could not delete message');
  }
});


// GET Profile with message history
app.get('/profile/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const profileId = req.params.id;

  try {
    const profileUser = await User.findById(profileId);
    const messages = await Message.find({
      $or: [
        { sender: req.session.user._id, receiver: profileId },
        { sender: profileId, receiver: req.session.user._id }
      ]
    }).sort({ timestamp: 1 });

    res.render('profile', {
      user: req.session.user,
      profileUser,
      messages
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Profile could not be loaded');
  }
});

// Password Reset (Placeholder)
app.get('/reset-password', (req, res) => {
    res.send(`
        <h2>Reset Password</h2>
        <form method="POST" action="/reset-password">
            <input type="email" name="email" placeholder="Enter your email" required />
            <button type="submit">Send Reset Link</button>
        </form>
    `);
});

app.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.send("Email not found.");

    res.send("A reset link would be sent to your email. (Not implemented)");
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Start server
app.listen(PORT, () => {
    console.log('Server running on http://localhost:${PORT}');
});