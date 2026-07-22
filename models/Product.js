const mongoose = require("mongoose");

const productSchema =
new mongoose.Schema({

id:String,

name:String,

price:Number,

image:String,

type:String,

category:String,

platform:String,

login:String,

password:String,

download:String,

seller:String,

promoted:{
type:Boolean,
default:false
},

promotionEnd:{
type:Date,
default:null
},

stockData:{
type:String,
default:""
}

},
{
timestamps:true
}

);

module.exports =
mongoose.model(
"Product",
productSchema
);