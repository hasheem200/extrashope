const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema({

  seller:String,

  amount:Number,

  method:String,

  binanceAccount:String,

  status:{
    type:String,
    default:"Pending ⏳"
  }

},{
  timestamps:true
});

module.exports =
mongoose.model(
 "Withdraw",
 withdrawSchema
);

