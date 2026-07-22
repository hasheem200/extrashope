const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({

productId:{
type:String,
required:true
},

seller:{
type:String,
default:""
},

user:{
type:String,
required:true
},

stars:{
type:Number,
required:true
},

text:{
type:String,
required:true
}

},{
timestamps:true
});

module.exports =
mongoose.model("Review",reviewSchema);