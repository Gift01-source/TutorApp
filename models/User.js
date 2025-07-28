const mongoose=require('mongoose');

const UserSchema=new mongoose.Schema({
    name:String,
    email:{type:String,unique:true},
    password:String,
    gender:String,
    age:Number,
    bio:String,
    photo:String,
    like:[String],
    matches:[String]
});

module.exports=mongoose.model('User',UserSchema);
