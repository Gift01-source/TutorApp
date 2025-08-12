const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const User = require('./models/User');
const Message = require('./models/Message');
const Payment = require('./models/Payment');
const messageRouter = require('./routes/messages');
const {getUserChats}=require('./utils/chatService');
const resetPasswordRoutes = require('./routes/reset-password');
const chatRoutes = require('./routes/chatList');

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const io=socketIO(server)
//const io = new Server(server);

//const io = new Server(server);

const SUBSCRIPTION_PRICES = {
  day: 899,
  week: 4999,
  month: 9999
};

const PAYMENT_METHODS=['Airtel Money','TNM Mpamba','NBM Mo626'];
const profileRoutes = require('./routes/profile');
const matchRoutes = require('./routes/matches');
const likeRoutes = require('./routes/likes');
const { receiveMessageOnPort } = require('worker_threads');


app.use(session({
    secret: 'soulswipe_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
    }
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set('views',path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/message',messageRouter);
app.use('/payment',Payment);
app.use('/profile', requireLogin, profileRoutes);
app.use('/matches', requireLogin, matchRoutes);
app.use('/likes', requireLogin, likeRoutes);
app.use('/chat',require ('./routes/chat'));
app.use('/', chatRoutes);
app.use('/', resetPasswordRoutes);
app.use('/',require ('./routes/profilee'));
/*
app.use(session({
    secret: 'soulswipe_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
    }
}));
*/
// MongoDB Connection
mongoose.connect('mongodb+srv://gift:2002@cluster0.i8kqrfw.mongodb.net/SoulSwipe?retryWrites=true&w=majority')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
   }
  );

const upload = multer({ storage });

// Helper function to escape special regex characters from user input
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

//send  image
app.post('/upload-image',upload.single('image'),async(req,res)=>{
  const{from,to}=req.body;
  const imagePath=`/uploads/${req.file.filename}`;

  const newMessage=new Message({
    from,
    to,
    content:imagePath,
    type:image
  });
  await newMessage.save();

  io.to(to).emit('receiveMessage',newMessage);
  io.to(from).emit('receiveMessage',newMessage);

  res.json({success:true,message:newMessage});
});

function isLoggedIn(req, res, next) {
    if (req.session && req.session.user && req.session.user_id) {
      req.user=req.session.user;

        next();
    } else {
        res.redirect('/login');
    }
    
}

//routes

//mounting


function requireLogin(req, res, next) {
  
    return res.redirect('/login');
  
  next();
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const registerRoutes=require('./routes/register');
app.use('/',registerRoutes);
/*
// Register
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { name, email, password,gender,bio,age } = req.body;

        if (!email) {
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
      //setting session
        req.session.userId=newUser._id;
res.send(`
  <div style="
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    background-color: #dff0d8;
    color: #3c763d;
    font-family: Arial, sans-seri
  ">
    <h2>Registration Successful!</h2>
    <p>You can now <a href="/login" style="color: #4CAF50; text-decoration: none; font-weight: bold;">Login</a>.</p>
  </div>
`);

  

       // await newUser.save();
       // res.send('Registration successful! You can now <a href="/login">Login</a>.');
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send('Server error during registration.');
    }
});
*/
// Login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    /*if(!email||password){
      return res.status('400').rederirect('/login.html',{error:'Please enter your email nd password'});
    }*/
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).send('Invalid email.');

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).send('Invalid password.');

         // setting session
        req.session.user = {
          _id:user._id,
          name:user.name,
          location:user.location||null,
          interests:user.interests,
          image:user.image,
      email:email};

       const users = await User.find({
      _id: { $ne: req.session.user._id },
    //  interests: { $in: loggedInUser.interests || [] },
     // location: loggedInUser.location || '',
     // $or: [{ name: regex }, { email: regex }]
    }).select('name email profileImage isOnline interests location');

    const likedBy = await User.find({ likes: req.session.user._id }).select('name profileImage');

    res.render('dashboard', {
      //user: loggedInUser,
      users,
      likedBy,
      //query,
    });

       // res.render('dashboard',{users:users});
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error during login.');
    }
});



//DAS
/*
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

        res.render('dashboard', {
            user: req.session.user,
            users:users,
            likedBy,
            query
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Error loading dashboard.');
    }
});*/
// Dashboard
app.get('/dashboard', isLoggedIn, async (req, res) => {
  if (!req.session || !req.session.user || !req.session.user._id) {
    console.log('User session missing or expired');
    return res.redirect('/login');  // or send an error if preferred
  }

  const query = req.query.q || '';
  const safeQuery = escapeRegex(query);
  const regex = new RegExp(safeQuery, 'i');

  try {
    const loggedInUser = await User.findById(req.session.user._id);
    if (!loggedInUser) {
      console.log('No user found in DB with session id');
      return res.redirect('/login');
    }

    const users = await User.find({
      _id: { $ne: req.session.user._id },
    //  interests: { $in: loggedInUser.interests || [] },
     // location: loggedInUser.location || '',
      $or: [{ name: regex }, { email: regex }]
    }).select('name email profileImage isOnline interests location');

    const likedBy = await User.find({ likes: req.session.user._id }).select('name profileImage');

    res.render('dashboard', {
      user: loggedInUser,
      users,
      likedBy,
      query,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading dashboard.');
  }
});
 //Messaging routes
app.get('/message/:id', async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.id);
    const messages = await Message.find({
      $or: [
        { from: req.user._id, to: req.params.id },
        { from: req.params.id, to: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.render('chat', {
      otherUser,
      messages,
      currentUser: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading chat');
  }
});
app.post('/message/:id', async (req, res) => {
  try {
    await Message.create({
      from: req.user._id,
      to: req.params.id,
      content: req.body.content
    });
    res.redirect(`/message/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not send message');
  }
});
/*chat
app.get('/chat/',  async (req, res) => {
    const conversations = await getUserChats(req.user._id);
     // Implement as needed
    res.render('chat', { conversations, currentUser:req.user});
 });

app.get('/chat/:otherUserId', isLoggedIn, async (req, res) => {
  try {
    const otherUserId = req.params.otherUserId; // Corrected parameter name
    const otherUser = await User.findById(otherUserId);

    if (!otherUser) return res.status(404).send('Users not found');

    // Find messages between current user and other user
    const messages = await Message.find({
      $or: [
        { from: req.user._id, to: otherUser._id },
        { from: otherUser._id, to: req.user._id }
      ]
    }).sort({ timestamp: 1 });

    res.render('chat', {
      otherUser,
      messages,
      currentUser: req.user
    });
  } catch (err) {
    console.error('Chat load error:', err);
    res.redirect('/chat'); // Redirect to a more appropriate page
  }
});*/

app.post('/message/:id', isLoggedIn, async (req, res) => {
    try {
        await Message.create({
            sender: req.session.user._id,
            receiver: req.params.id,
            content: req.body.content,
            timestamp: new Date()
        });

        res.redirect(`/message/${req.params.id}`);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).send('Message send failed');
    }
});

// Edit message
app.post('/message/:id/edit', isLoggedIn, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).send('Message not found');
    if (message.sender.toString() !== req.session.user._id) {
      return res.status(403).send('Unauthorized');
    }

    message.content = req.body.content;
    await message.save();

    res.redirect(`message`);
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).send('Could not edit message');
  }
});

// Delete message
app.post('/message/:id/delete', isLoggedIn, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).send('Message not found');
    if (message.sender.toString() !== req.session.user._id) {
      return res.status(403).send('Unauthorized');
    }

    await message.remove();
    res.redirect(`message`);
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).send('Could not delete message');
  }
});



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

/* Password Reset
app.get('/reset-password', async (req, res) => {
    res.render(`reset-password`);
});

app.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.send("Email not found.");

    res.render('reset-password');
});*/


/*app.get('/chat', isLoggedIn, async (req, res) => {
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
});*/

//socket
const onlineUsers=new Map();

io.on('connection', (socket) => {
  console.log('New client connected');

    socket.on('join',async (userId) => {
      await User.findByIdAndUpdate(userId,{onlin:true});
     socket.join(userId); // join a room named by userId
    console.log(`User joined room: ${userId}`);
  });

  socket.on('userOnline',async (userId) => {

     onlineUsers.set(userId,socket.id); // join a room named by userId
    console.log(`User online: ${userId}`);

    //brodcasting to others
    io.emit('onlineUsers',
      Array.from(onlineUsers.keys()));
    }
    );

  socket.on('sendMessage', async(data) => {
    const newMessage=new Message(data);
    await newMessage.save();
    // emit message to recipient’s room
    io.to(data.to).emit('receiveMessage',newMessage);
    io.to(data.from).emit('receiveMessage',newMessage);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected`);
  });
});

// Edit message
app.post('/message/:id/edit', async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { content: req.body.content });
  res.redirect('back');  
});

// Delete message
app.post('/message/:id/delete', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.redirect(`back`);
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
    const profileuser = await User.findById(req.session.user._id);
    res.render('profile1', { profileuser });
});


// Show edit form
app.get('/profile1/edit', async (req, res) => {
  const profileuser = await User.findById(req.session.userId);
  res.render('edit-profile', { profileuser });
});

// Handle form submit
app.post('/profile1/edit', upload.single('profilePicture'), async (req, res) => {
  try{
    const updateData={
      profileuser:req.body.profileuser,
      age:req.body.age,
      gender:req.body.gender,
      bio:req.body.bio,
      interests:req.body.interests?
      req.body.interests.split(',').map(i=>i.trim()):[],
    };
    if(!req.file){
      updateData.profilePicture='/uploads'+ req.file.filename;
    }
  
  await profileuser.findByIdAndUpdate(req.session.userId, updateData);

  res.redirect(`/profile1`);
  }catch(error){
    console.error('Profile update erro:',error);
  }
});

app.get('/premium', isLoggedIn, (req, res) => {
    res.render('subscribe');
});

app.get('/privacy',(req,res)=>{
res.render('privacy');
})

app.get('/subscribe', isLoggedIn, async (req, res) => {
    await User.findByIdAndUpdate(req.session.user._id, { premium: true });
    res.redirect(`/subscribe`);
});
//subscription
app.post('/subscribe',(req,res)=>{
  const selectPlan=req.body.plan;
  //save plan for user db
  res.redirect(`/payment`);
});

//payment 
app.get('/payment',(req,res)=>{
    res.render('payment');
});
// Payment POST route
app.post('/payment', (req, res) => {
  const { duration, provider } = req.body;
  const amount= SUBSCRIPTION_PRICES[duration];

  if (!amount) {
    return res.status(400).send('Invalid ');
    
  } 
  const result={
    status:'success',
   message : 'Paid MWK ${amount} for a ${duration}subscription using ${provider}.'};
  

  // save to database
  res.render('payment-result', { result });
});

app.post('/update-settings', isLoggedIn, async (req, res) => {
    const { email, password } = req.body;
    const update = { email };
    if (password) update.password = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.session.user._id, update);
    res.redirect(`/settings`);
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect(`/`);
    });
});

// Fallback route
app.use((req, res) => {
    res.status(404).send("Page not found");
});

// Placeholder utility functions
//async function getUserChats(userId) {
    // TODO: Implement chat fetching logic here
   // return [];
//}

async function getUsersWhoLikedMe(userId) {
    // TODO: Implement like fetching logic here
    return [];
}

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
