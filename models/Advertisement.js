const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema({

    advertiser:{
        type:String,
        required:true
    },

    bannerType:{
        type:String,
        required:true
    },

    website:{
    type:String,
    default:""
},

    bannerImage:{
        type:String,
        default:""
    },

    days:{
        type:Number,
        default:1
    },

    price:{
        type:Number,
        default:0
    },

    paymentProof:{
        type:String,
        default:""
    },

    status:{
        type:String,
        default:"Pending"
    },

    approvedAt: {
    type: Date
    },

    expiresAt: {
    type: Date
    },
    
    createdAt:{
        type:Date,
        default:Date.now
    }

});

module.exports =
mongoose.model(
    "Advertisement",
    advertisementSchema
);