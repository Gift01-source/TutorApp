const express =require('express');
const bodyParser =require('body-parser');
const session =require('express-session');
const bcrypt =require('bcrypt');
const path =require('path');
const mongoose=require('mongoose');
const User=require('./models/User');
const multer=require('multer');

const app =express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.use(session({
    secret:'soulswwipe_secret',
    resave:false,
    saveUninitialized:true
}));

mongoose.connect('mongodb+srv://gift:2002@cluster0.i8kqrfw.mongodb.net/TutorApp?retryWrites=true&w=majority')
.then(()=>console.log('connected to mongoDB'));

const UserSchema=new mongoose.Schema({
    name:String,
    email:{type:String,unique:true},
    password:String,
    gender:String,
    age:Number,
    bio:String,
    image:String,
    like:[String],
    matches:[String]
});

const User =mongoose.model('User',UserSchema);

const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./public/uploads');
    },
    filename:function(req,file,cb){
        cb(null,Date.now()+path.extname(file.originalname));
    }
});
const upload=multer({storage});

//app.use(session({
  //  secret:'TutorApp_secret',
    //resave:false,
    //saveUninitialized:true
//}));



//routes
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','index.html'))
});

app.get('/register',(req,res)=>{
    res.sendFile(path.join(__dirname,'public/register.html'));
});

app.get('/register',upload.single('image'),
async (req,res)=>{
    try{
        const {name,email,password,gender,age,bio}=req.body;
        
        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(400).send('Email already registered.Please log in.');
        }

        const hashedPassword=await bcrypt.hash(password,10);

        const newUser=new User({
            name,
            email,
            password:hashedPassword,
            gender,
            bio,
            imag:req.fil ? req.file.filename:null
        });

        await newUser.save();
        res.send('Registration successful you can now <a href="/login">Login</a>.');
    } catch (err){
             console.error('Error during registration', err);
        res.status(500).send('Server error');
    }
});

app.get('/login',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','login.html'))
});

app.post('/login',async(req,res)=>{
    const{name,email,password}=req.body;
    try{
         const user=await User.findOne({email});
         if(!user){
            return res.send('Invalid Email');
         }
        const isMatch =await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).send('Invalid password');
           req.session.user=user;
           res.redirect('/dashboard');
    }catch(err){
        console.error('Error during login:',err);
        res.status(500).snd('Server error');
    }
});


app.get('/dashboard',(req,res)=>{
    if(!req.session.user) return res.redirect('/login');
        res.send('<h1>Welcome ${req.session.username}</h1><a href="/logout">Logout</a>');
});

app.get('/profile',(req,res)=>{
    if(!req.session.user)return res.redirect('/login');
    res.sendFile(path.join(__dirname,'public','profile.html'));
});

app.post('/profile',upload.single('photo'),
async(req,res)=>{
    const {name,bio}=req.body;
    const photo=req.file.filename;

    await User.updateOne({username:
        req.session.user.username},{name,bio,photo});
        req.session.user=await User.findOne({username:
            req.session.user.username});
            res.redirect('/dashboard');
});

app.get('/logout',(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/');
    });
});


app.listen(PORT,()=>{
    console.log('Sever running on http://localhost:${PORT}');
});