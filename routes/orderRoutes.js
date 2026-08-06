const User = require("../models/User");

const express = require("express");

const router = express.Router();

const Order = require("../models/Order");


const Product = require("../models/Product");

const Settings = require("../models/Settings");
const notifyAdmin = require("../utils/notifyAdmin");
const notifyUserByEmail = require("../utils/notifyUserByEmail");

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

const orderTotal = Number(order.total || 0);

const productNames = (order.products || [])
    .map(p => p.name)
    .filter(Boolean)
    .join(", ");

// One order can contain products from multiple sellers — notify
// each affected seller individually about their own item(s).
const productsBySeller = {};

for (const product of (order.products || [])) {

    const sellerName = product.seller || "Admin";

    if (!productsBySeller[sellerName]) productsBySeller[sellerName] = [];

    productsBySeller[sellerName].push(product);

}

for (const [sellerName, products] of Object.entries(productsBySeller)) {

    const sellerTotal = products.reduce((sum, p) => sum + Number(p.price || 0), 0);

    notifyUserByEmail(sellerName, {
        type: "warning",
        title: "You Made a Sale! 🎉",
        message: `${req.user.nickname} just ordered ${products.length > 1 ? "your products" : "your product"}. It's pending payment verification.`,
        details: {
            Buyer: req.user.nickname,
            Items: products.map(p => p.name).filter(Boolean).join(", "),
            Total: `$${sellerTotal.toFixed(2)}`
        },
        actionUrl: `${req.protocol}://${req.get("host")}/seller-products`,
        actionLabel: "View Your Orders"
    });

}

notifyAdmin({
    type: "warning",
    title: "New Order Placed",
    message: `${req.user.nickname} placed a new order that needs payment verification.`,
    details: {
        Customer: req.user.nickname,
        Total: `$${orderTotal.toFixed(2)}`,
        Items: productNames || `${(order.products || []).length} item(s)`
    },
    actionUrl: `${req.protocol}://${req.get("host")}/admin-orders`,
    actionLabel: "Review Order"
});

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

notifyUserByEmail(order.customer, {
    type: "success",
    title: "Your Order Has Been Approved! 🎉",
    message: order.deliveredLogin
        ? "Your payment was verified and your product is ready. Your access details are below."
        : "Your payment was verified and your order has been processed.",
    details: {
        Total: `$${Number(order.total || 0).toFixed(2)}`,
        ...(order.deliveredLogin ? {
            Login: order.deliveredLogin,
            Password: order.deliveredPassword
        } : {})
    },
    actionUrl: `${req.protocol}://${req.get("host")}/orders`,
    actionLabel: "View Your Order"
});

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

notifyUserByEmail(seller.nickname, {
    type: "success",
    title: "Order Approved — You Got Paid! 💰",
    message: `Your sale of "${product.name || "a product"}" was approved. $${sellerAmount.toFixed(2)} has been added to your wallet.`,
    details: {
        Product: product.name || "N/A",
        Earned: `$${sellerAmount.toFixed(2)}`,
        "New Balance": `$${seller.wallet.toFixed(2)}`
    },
    actionUrl: `${req.protocol}://${req.get("host")}/seller-dashboard`,
    actionLabel: "View Dashboard"
});

settings.adminWallet =
Number(settings.adminWallet || 0) + Number(adminAmount);

}

await settings.save();

console.log("Admin Wallet After Save =", settings.adminWallet);
console.log("Commission =", commission);
console.log("Admin Wallet =", settings.adminWallet);

notifyAdmin({
    type: "success",
    title: "Order Approved",
    message: `Order for ${order.customer} was approved and ${order.deliveredLogin ? "delivery credentials were released" : "processed"}.`,
    details: {
        Customer: order.customer,
        Total: `$${Number(order.total || 0).toFixed(2)}`
    }
});

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
