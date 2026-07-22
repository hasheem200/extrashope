const mongoose = require("mongoose");

const walletSchema =
new mongoose.Schema({

seller:String,

balance:{
type:Number,
default:0
},

pending:{
type:Number,
default:0
},

totalEarned:{
type:Number,
default:0
}

});

module.exports =
mongoose.model(
"Wallet",
walletSchema
);