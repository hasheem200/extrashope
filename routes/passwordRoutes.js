const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const getMailer = require("../config/mailerFactory");
const Settings = require("../models/Settings");

/* FORGOT PASSWORD */

router.post("/forgot", async(req,res)=>{

try{

const { email } = req.body;

const user =
await User.findOne({ email });

if(!user){

return res.json({
message:"Email not found"
});

}

const token =
crypto.randomBytes(32).toString("hex");

user.resetToken = token;

user.resetExpire =
Date.now() + 1000 * 60 * 30;

await user.save();

const settings = await Settings.findOne();

const siteUrl =
settings.siteSettings.siteUrl || "http://localhost:5001";

const link =
<<<<<<< HEAD
`${siteUrl}/reset-password.html?token=${token}`;

console.log("SITE URL:", siteUrl);
console.log("RESET LINK:", link);

const mailer = await getMailer();
=======
`https://extrashope.com/reset-password.html?token=${token}`;
>>>>>>> 81441a205521af138c5267630de83365fff358b8

await mailer.sendMail({

from:`${settings.siteSettings.senderName} <${settings.siteSettings.smtpUser}>`,

to:user.email,

subject:"Reset Password",

html:`

<h2>Hello ${user.nickname}</h2>

<p>Click the button below to reset your password.</p>

<a href="${link}"
style="
padding:12px 20px;
background:#00c853;
color:white;
text-decoration:none;
border-radius:6px;
">

Reset Password

</a>

<p>This link expires in 30 minutes.</p>

`

});

res.json({

message:"Reset email sent"

});

}catch(err){

console.log(err);

res.status(500).json(err);

}

});


/* RESET PASSWORD */

router.post("/reset", async(req,res)=>{

try{

const {

token,

password

} = req.body;

const user =
await User.findOne({

resetToken:token,

resetExpire:{
$gt:Date.now()
}

});

if(!user){

return res.json({

message:"Invalid or expired link"

});

}

user.password =
await bcrypt.hash(password,10);

user.resetToken = undefined;

user.resetExpire = undefined;

await user.save();

res.json({

message:"Password updated successfully"

});

}catch(err){

console.log(err);

res.status(500).json(err);

}

});

module.exports = router;
