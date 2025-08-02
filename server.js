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
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(session({
    secret: 'soulswipe_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
    }
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

// Helper function to escape special regex characters from user input
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isLoggedIn(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes

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
app.get('/dashboard', isLoggedIn, async (req, res) => {
    const query = req.query.q || '';
    const safeQuery = escapeRegex(query);
    const regex = new RegExp(safeQuery, 'i');

    try {
        const users = await User.find({
            _id: { $ne: req.session.user._id },
            $or: [{ name: regex }, { email: regex }]
        });

        const likedBy = await User.find({ likes: req.session.user._id });

        res.render("dashboard", {
            user: req.session.user,
            users,
            likedBy,
            query
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Error loading dashboard.');
    }
});

// Messaging routes
app.get('/message/:id', isLoggedIn, async (req, res) => {
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
        console.error('Message error:', err);
        res.status(500).send('Could not load messages');
    }
});

app.post('/message/:id', isLoggedIn, async (req, res) => {
    try {
        await Message.create({
            sender: req.session.user._id,
            receiver: req.params.id,
            content: req.body.content,
            timestamp: new Date()
        });

        res.redirect('/message/${req.params.id}');
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).send('Message send failed');
    }
});

app.post('/message/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message || !message.sender.equals(req.session.user._id)) {
            return res.status(403).send('Unauthorized');
        }

        message.content = req.body.content;
        await message.save();

        res.redirect('/profile/${message.receiver}');
    } catch (err) {
        console.error('Edit message error:', err);
        res.status(500).send('Could not edit message');
    }
});

app.post('/message/:id/delete', isLoggedIn, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message || !message.sender.equals(req.session.user._id)) {
            return res.status(403).send('Unauthorized');
        }

        const receiverId = message.receiver;
        await message.remove();

        res.redirect('/profile/${receiverId}');
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).send('Could not delete message');
    }
});

// Profile
app.get('/profile/:id', isLoggedIn, async (req, res) => {
    try {
        const profileUser = await User.findById(req.params.id);
        const messages = await Message.find({
            $or: [
                { sender: req.session.user._id, receiver: req.params.id },
                { sender: req.params.id, receiver: req.session.user._id }
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

// Password Reset
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

// Other pages
app.get('/chat', isLoggedIn, async (req, res) => {
    const conversations = await getUserChats(req.session.user._id); // Implement as needed
    res.render('chat', { conversations });
});

// Show chat page
app.get('/chat/:id', async (req, res) => {
  try {
    const currentUser = req.session.user; // current logged-in user
    const chatUser =await useReducer.findById(req.params.id);

    if(!chatUser||!currentUser) return
    res.status(404).send('User not found');

    const messages = await Message.find({
      $or: [
        { from: currentUser._id, to: chatUser._id },
        { from: chatUser._id, to: currentUser._id }
      ]
    });

    res.render('chat', {
      currentUser,
      chatUser,
      messages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// Send message
app.post('/chat/:id', async (req, res) => {
  await Message.create({
    sender: req.user._id,
    receiver: req.params.id,
    content: req.body.content
  });
  res.redirect('/chat/' + req.params.id);
});

// Edit message
app.post('/message/:id/edit', async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { content: req.body.content });
  res.redirect('back');
});

// Delete message
app.post('/message/:id/delete', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.redirect('back');
});

app.get('/likes', isLoggedIn, async (req, res) => {
    const likes = await getUsersWhoLikedMe(req.session.user._id); // Implement as needed
    res.render('likes', { likes });
});

app.get('/settings', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.session.user._id);
    res.render('settings', { user });
});

app.get('/profile1', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.session.user._id);
    res.render('profile', { user });
});


// Show edit form
app.get('/profile/edit', async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('edit-profile', { user });
});

// Handle form submit
app.post('/profile1/edit', async (req, res) => {
  const { name, age, gender } = req.body;
  await User.findByIdAndUpdate(req.session.userId, { name, age, gender });
  res.redirect('/profile1');
});

app.get('/premium', isLoggedIn, (req, res) => {
    res.render('subscribe');
});

app.get('/privacy',(req,res)=>{
res.render('privacy');
})

app.get('/subscribe', isLoggedIn, async (req, res) => {
    await User.findByIdAndUpdate(req.session.user._id, { premium: true });
    res.redirect('/subscribe');
});
//subscription
app.post('/subscribe',(req,res)=>{
  const selectPlan=req.body.plan;
  //save plan for user db
  res.send('You selected:${selectedPlan}');
});

app.post('/update-settings', isLoggedIn, async (req, res) => {
    const { email, password } = req.body;
    const update = { email };
    if (password) update.password = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.session.user._id, update);
    res.redirect('/settings');
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Fallback route
app.use((req, res) => {
    res.status(404).send("Page not found");
});

// Placeholder utility functions
async function getUserChats(userId) {
    // TODO: Implement chat fetching logic here
    return [];
}

async function getUsersWhoLikedMe(userId) {
    // TODO: Implement like fetching logic here
    return [];
}

// Start server
app.listen(PORT, () => {
    console.log('Server running on http://localhost:${PORT}');
});