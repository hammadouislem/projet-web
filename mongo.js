
const mongoose=require("mongoose")

mongoose.connect("mongodb+srv://islemhamma:azerty123F@cluster0.hynk9cc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
.then(()=>{
    console.log('mongoose connected');
})
.catch((e)=>{
    console.log('failed');
})

const logInSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },

    password:{
        type:String,
        required:true
    },
    picture:{
        type :String,
        required : true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
})

const LogInCollection=new mongoose.model('LogInCollection',logInSchema)

module.exports=LogInCollection
