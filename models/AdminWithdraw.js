const mongoose = require("mongoose");

const adminWithdrawSchema = new mongoose.Schema({

    amount: {
        type: Number,
        required: true
    },

    method: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    source: {
        type: String,
        default: "wallet"   // wallet أو ads
    },

    status: {
        type: String,
        default: "Pending ⏳"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports =
mongoose.model(
"AdminWithdraw",
adminWithdrawSchema
);