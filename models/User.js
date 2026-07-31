const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

nickname:{
type:String,
required:true,
unique:true
},

email:{
type:String,
required:true,
unique:true
},

password:{
type:String,
required:true
},

role:{
type:String,
default:"user"
},

blocked: {
    type: Boolean,
    default: false
},

blockUntil: {
    type: Date,
    default: null
},

blockReason: {
    type: String,
    default: ""
},

wallet:{
type:Number,
default:0
},

totalSales:{
type:Number,
default:0
},

verified:{
type:Boolean,
default:false
},

storeName:{
type:String,
default:""
},

storeDescription:{
type:String,
default:""
},

storeLogo:{
type:String,
default:""
},

storeBanner:{
type:String,
default:""
},

resetToken:{
type:String,
default:null
},

resetCode:{
type:String,
default:null
},

resetExpire:{
type:Date,
default:null
}

},{
timestamps:true
});

module.exports =
mongoose.model(
"User",
userSchema
);

