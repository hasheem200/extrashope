const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

service:"gmail",

auth:{

user:"monahasheem@gmail.com",

pass:"qkft ysvx dsxv jpjk"

}

});

module.exports = transporter;