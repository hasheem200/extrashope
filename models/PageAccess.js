const mongoose = require("mongoose");

/*
  Stores which roles (visitor / buyer / seller / admin) are allowed
  to view each page. Admin -> Page Access Control saves an array of
  these. A page with no matching document is treated as open by
  default (enforced client-side in public/js/page-access.js).
*/
const pageAccessSchema = new mongoose.Schema({

    path: {
        type: String,
        required: true,
        trim: true
    },

    visitor: {
        type: Boolean,
        default: true
    },

    buyer: {
        type: Boolean,
        default: true
    },

    seller: {
        type: Boolean,
        default: true
    },

    admin: {
        type: Boolean,
        default: true
    }

});

module.exports = mongoose.model("PageAccess", pageAccessSchema);
