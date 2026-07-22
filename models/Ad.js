const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({

    advertiser: {
        type: String,
        required: true
    },

    email: String,

    image: String,

    website: String,

    position: {
        type: String,
        required: true
    },

    size: String,

    days: Number,

    price: Number,

    paymentImage: String,

    status: {
        type: String,
        default: "Pending"
    },

    startDate: Date,

    endDate: Date,

    views: {
        type: Number,
        default: 0
    },

    clicks: {
        type: Number,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Ad", adSchema);