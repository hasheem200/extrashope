const User = require("../models/User");

const express = require("express");

const router = express.Router();

const Order = require("../models/Order");


const Product = require("../models/Product");

const Settings = require("../models/Settings");

const { verifyToken, requireRole } = require("../middleware/auth");

/*
  GET ORDERS
  - Admin: sees everything (needed to manage/approve orders).
  - Everyone else: only their own orders (matched by "customer").
  This used to return EVERY order for EVERY customer to anyone who
  called this endpoint — including delivered digital-goods logins
  and passwords for products they never bought.
*/

router.get("/", verifyToken, async(req,res)=>{

try{

let orders;

if(req.user.role === "admin"){

orders = await Order.find();

}else{

orders = await Order.find({ customer: req.user.nickname });

}

res.json(orders);

}catch(err){

res.status(500).json(err);

}

});

/* CREATE ORDER — must be logged in; can only place an order as yourself */

router.post("/", verifyToken, async(req,res)=>{

try{

const body = { ...req.body, customer: req.user.nickname };

const order =
new Order(body);

await order.save();



res.json({

message:"Order Created",

order

});

}catch(err){

res.status(500).json(err);

}

});

/* UPDATE STATUS (approve/etc.) — admin only: this releases stock
   credentials and pays out seller/admin wallets, so it must be
   tightly controlled. */


router.put("/:id", verifyToken, requireRole("admin"), async(req,res)=>{


try{

const order =
await Order.findById(req.params.id);

if(!order){

return res.status(404).json({
message:"Order Not Found"
});

}

if(order.status === "Approved"){
return res.json({
message:"Already Approved"
});
}

/* APPROVE */

if(req.body.status === "Approved"){

console.log("APPROVE CLICKED");

const product = order.products[0];

const dbProduct =
await Product.findOne({
id: product.id
});

console.log("PRODUCT:");
console.log(product);

console.log("STOCK:");
console.log(dbProduct?.stockData);

if(
dbProduct &&
dbProduct.stockData &&
dbProduct.stockData.trim() !== ""
){

const lines =
dbProduct.stockData
.split("\n")
.filter(line => line.trim());

if(lines.length > 0){

const firstLine = lines.shift();

const parts =
firstLine.split(":");

order.deliveredLogin =
parts[0] || "";

order.deliveredPassword =
parts[1] || "";

dbProduct.stockData =
lines.join("\n");

await dbProduct.save();

await order.save();

console.log("STOCK SAVED");
console.log(dbProduct.stockData);



}

}

order.status = "Approved";

await order.save();

// PERFORMANCE: fetch Settings ONCE before the loop instead of
// once per product — with a multi-item order this was hitting
// the database repeatedly for the exact same document.
let settings = await Settings.findOne();

if (!settings) {

    settings = await Settings.create({
        commission: 10,
        adminWallet: 0
    });

}

const commission = Number(settings.commission || 10);

for(const product of order.products){

const sellerName =
product.seller || "Admin";

const seller =
await User.findOne({
nickname: sellerName
});

if(!seller) continue;

const price = Number(product.price || 0);

const adminAmount = price * (commission / 100);

const sellerAmount = price - adminAmount;


console.log("Seller:", seller.nickname);
console.log("Before:", seller.wallet);

seller.wallet += sellerAmount;
seller.totalSales += 1;

await seller.save();

settings.adminWallet =
Number(settings.adminWallet || 0) + Number(adminAmount);

}

await settings.save();

console.log("Admin Wallet After Save =", settings.adminWallet);
console.log("Commission =", commission);
console.log("Admin Wallet =", settings.adminWallet);



return res.json({
message:"Order Approved",
order
});

}

/* NORMAL UPDATE */

const updatedOrder =
await Order.findByIdAndUpdate(
req.params.id,
req.body,
{ new:true }
);

res.json({
message:"Order Updated",
updatedOrder
});

}catch(err){

console.log(err);

res.status(500).json(err);

}

});

/* DELETE — admin only */

router.delete("/:id", verifyToken, requireRole("admin"), async(req,res)=>{

try{

await Order.findByIdAndDelete(
req.params.id
);

res.json({
message:"Order Deleted"
});

}catch(err){

res.status(500).json(err);

}

});

module.exports = router;
