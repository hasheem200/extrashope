const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

customer:{
type:String,
required:true
},

products:{
type:Array,
required:true
},

total:{
type:Number,
required:true
},

paymentProof:{
type:String,
default:""
},

status:{
type:String,
default:"Pending"
},

deliveredLogin:{
type:String,
default:""
},

deliveredPassword:{
type:String,
default:""
},

deliveredDownload:{
type:String,
default:""
},

createdAt:{
type:Date,
default:Date.now
}

});

module.exports =
mongoose.model(
"Order",
orderSchema
);