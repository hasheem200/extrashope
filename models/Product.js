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
},

// The fields below support a richer "showcase" product page
// (like selling a website template/source code) — all optional,
// a normal product just leaves them blank.

version:{
type:String,
default:""
},

liveDemoUrl:{
type:String,
default:""
},

screenshots:{
type:String, // comma-separated list of image URLs
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