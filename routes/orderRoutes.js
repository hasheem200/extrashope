const User = require("../models/User");

const express = require("express");

const router = express.Router();

const Order = require("../models/Order");


const Product = require("../models/Product");

const Settings = require("../models/Settings");

/* GET ORDERS */

router.get("/", async(req,res)=>{

try{

const orders =
await Order.find();

res.json(orders);

}catch(err){

res.status(500).json(err);

}

});

/* CREATE ORDER */

router.post("/", async(req,res)=>{

try{

const order =
new Order(req.body);

await order.save();



res.json({

message:"Order Created",

order

});

}catch(err){

res.status(500).json(err);

}

});

/* UPDATE STATUS */


router.put("/:id", async(req,res)=>{


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



for(const product of order.products){

const sellerName =
product.seller || "Admin";

const seller =
await User.findOne({
nickname: sellerName
});

if(!seller) continue;

const price = Number(product.price || 0);


let settings = await Settings.findOne();

if (!settings) {

    settings = await Settings.create({
        commission: 10,
        adminWallet: 0
    });

}

const commission = Number(settings.commission || 10);

const adminAmount = price * (commission / 100);

const sellerAmount = price - adminAmount;


console.log("Seller:", seller.nickname);
console.log("Before:", seller.wallet);

seller.wallet += sellerAmount;
seller.totalSales += 1;

await seller.save();

settings.adminWallet =
Number(settings.adminWallet || 0) + Number(adminAmount);

await settings.save();

const check = await Settings.findOne();

console.log("Admin Wallet After Save =", check.adminWallet);

console.log("Commission =", commission);
console.log("Admin Amount =", adminAmount);
console.log("Admin Wallet =", settings.adminWallet);

}



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

/* DELETE */

router.delete("/:id", async(req,res)=>{

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