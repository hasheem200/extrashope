const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({

    seller:{
        type:String,
        required:true
    },

    role:{
        type:String,
        required:true
    },

    subject:{
        type:String,
        required:true
    },

    message:{
        type:String,
        required:true
    },

    reply:{
        type:String,
        default:""
    },

    status:{
        type:String,
        default:"Open"
    },

    createdAt:{
        type:Date,
        default:Date.now
    }

});

module.exports = mongoose.model("Support", supportSchema);