const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const User = require('./models/User');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'soulswipe_secret',
    resave: false,
    saveUninitialized: true
}));

// MongoDB connection
mongoose.connect('mongodb+srv://gift:2002@cluster0.i8kqrfw.mongodb.net/TutorApp?retryWrites=true&w=majority')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { username, email, password } = req.body.username;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already registered. Please <a href="/login">login</a>.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            gender,
            age,
            bio,
            image: req.file ? '/uploads/${req.file.filename}' :null
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
        if (!user) return res.status(400).send('Invalid email or user not found.');

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
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.send(`
        <h1>Welcome, ${req.session.user.name}</h1>
        <p>Email: ${req.session.user.email}</p>
        <p><a href="/profile">Edit Profile</a></p>
        <p><a href="/logout">Logout</a></p>
    `);
});

// Profile update
app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.post('/profile', upload.single('image'), async (req, res) => {
    try {
        const { name, bio } = req.body;
        const photo = req.file ? req.file.filename : req.session.user.image;

        await User.updateOne({ email: req.session.user.email }, { name, bio, image: photo });
        req.session.user = await User.findOne({ email: req.session.user.email });
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).send('Error updating profile.');
    }
});

// Password reset placeholder (expand later)
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
    
    // In real apps, send an email reset link here
    res.send("A reset link would be sent (not implemented in this demo).");
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Start server
app.listen(PORT, () => {
    console.log('Server running at http://localhost:${PORT}');
});