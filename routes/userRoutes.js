const express = require("express");

const router = express.Router();

const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");

const User = require("../models/User");

/* REGISTER */

router.post("/register", async(req,res)=>{

try{

const {
nickname,
email,
password,
role
} = req.body;

const oldUser =
await User.findOne({ email });

if(oldUser){

return res.json({
message:"User already exists"
});

}

const hashedPassword =
await bcrypt.hash(password,10);

const user =
new User({

nickname,

email,

password: hashedPassword,

role: role || "buyer",

wallet:0,

totalSales:0

});

await user.save();

res.json({
message:"Register Success"
});

}catch(err){

res.status(500).json(err);

}

});


/* LOGIN */

router.post("/login", async(req,res)=>{

try{

const {
email,
password
} = req.body;

if(!email || !password){

return res.status(400).json({
message:"Please enter email and password"
});

}

const user =
await User.findOne({ email });

if(!user){

return res.json({
message:"User not found"
});

}

const validPassword =
await bcrypt.compare(
password,
user.password
);

if(!validPassword){

return res.json({
message:"Wrong Password"
});

}

if(user.blocked){

return res.json({

message:"Your account is blocked.",

blocked:true,

until:user.blockUntil,

reason:user.blockReason

});

}

const token =
jwt.sign(

{
id:user._id,
role:user.role
},

"SECRETKEY",

{
expiresIn:"7d"
}

);

res.json({

token,

user:{

id:user._id,

nickname:user.nickname,

email:user.email,

role:user.role,

wallet:user.wallet,

totalSales:user.totalSales

}

});

}catch(err){

console.error(err);

res.status(500).json({
message:err.message
});

}

});

/* GET USERS */

router.get("/", async(req,res)=>{

try{

const users =
await User.find();

res.json(users);

}catch(err){

res.status(500).json(err);

}

});

/* GET SINGLE USER */

router.get("/:nickname", async(req,res)=>{

try{

const user =
await User.findOne({
nickname:req.params.nickname
});

if(!user){

return res.status(404).json({
message:"User Not Found"
});

}

res.json(user);

}catch(err){

res.status(500).json(err);

}

});

router.get("/wallet/:nickname", async(req,res)=>{

try{

const User =
require("../models/User");

const user =
await User.findOne({
nickname:req.params.nickname
});

if(!user){

return res.status(404).json({
message:"User Not Found"
});

}

res.json({

wallet:user.wallet || 0,
totalSales:user.totalSales || 0,
nickname:user.nickname

});

}catch(err){

res.status(500).json(err);

}


});


router.get("/store/:nickname", async(req,res)=>{

try{

const user =
await User.findOne({
nickname:req.params.nickname
});

if(!user){
return res.status(404).json({
message:"Store not found"
});
}

res.json(user);

}catch(err){

res.status(500).json(err);

}

});




router.put("/store/:nickname", async(req,res)=>{

try{

const user =
await User.findOne({
nickname:req.params.nickname
});

if(!user){
return res.status(404).json({
message:"User not found"
});
}

user.storeName =
req.body.storeName || "";

user.storeDescription =
req.body.storeDescription || "";

user.storeLogo =
req.body.storeLogo || "";

user.storeBanner =
req.body.storeBanner || "";

await user.save();

res.json({
success:true,
message:"Store Updated"
});

}catch(err){

res.status(500).json(err);

}



});

/* CHANGE USER ROLE */

router.put("/:id/role", async(req,res)=>{

try{

const user =
await User.findById(req.params.id);

if(!user){

return res.status(404).json({
message:"User not found"
});

}

user.role = req.body.role;

await user.save();

res.json({
message:"Role Updated",
user
});

}catch(err){

res.status(500).json(err);

}

});

/* BLOCK / UNBLOCK USER */

/* BLOCK / UNBLOCK USER */

router.put("/:id/block", async (req, res) => {
 
    console.log(req.body);

try{

const user = await User.findById(req.params.id);

if(!user){

return res.status(404).json({
message:"User not found"
});

}

const { days, reason } = req.body;

// ===== Unblock =====

if(days===0){

user.blocked=false;
user.blockUntil=null;
user.blockReason="";

await user.save();

return res.json({
message:"User Unblocked",
user
});

}

// ===== Permanent =====

if(days==="permanent"){

user.blocked=true;
user.blockUntil=null;

}else{

user.blocked=true;

user.blockUntil=new Date(
Date.now() + Number(days)*24*60*60*1000
);

}

user.blockReason=reason || "";

await user.save();

res.json({

message:"User Blocked",
user

});

}catch(err){

console.log(err);

res.status(500).json(err);

}

});

/* DELETE USER */

router.delete("/:id", async(req,res)=>{

try{

await User.findByIdAndDelete(req.params.id);

res.json({
message:"User Deleted"
});

}catch(err){

res.status(500).json(err);

}

});

module.exports = router;
