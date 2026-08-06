const express = require("express");

const router = express.Router();

const Product =
require("../models/Product");

const { verifyToken, optionalAuth, requireRole } = require("../middleware/auth");

/*
  SECURITY: Product documents store the actual delivery credentials
  for digital goods (login/password/stockData). The old code
  returned those fields to EVERYONE browsing the store — meaning
  anyone could get the product's real login without ever paying
  for it. Now those fields are stripped out unless the viewer is
  the product's own seller or an admin.
*/
function sanitizeProduct(product, user) {

    const obj = product.toObject ? product.toObject() : product;

    const isOwner = user && (user.role === "admin" || user.nickname === obj.seller);

    if (!isOwner) {

        delete obj.login;
        delete obj.password;

        // SECURITY: "download" is the actual paid-content delivery
        // link (e.g. a Cloudinary URL to a source-code zip) — this
        // must never be visible before purchase, exactly like
        // login/password above. It gets delivered separately and
        // securely at order-approval time (see routes/orderRoutes.js
        // -> order.deliveredDownload), never carried through the
        // public product listing, the cart, or the order itself.
        delete obj.download;

        // IMPORTANT: the storefront (product.html / app.js) reads
        // stockData just to COUNT how many units are left in stock
        // ("X in stock" / add-to-cart availability) — it never
        // displays the actual lines to a non-owner. So instead of
        // deleting it outright (which would break stock counts for
        // every buyer), replace each real credential line with a
        // masked placeholder, keeping the same line count.
        if (obj.stockData) {

            const lineCount = obj.stockData
                .split("\n")
                .filter(line => line.trim()).length;

            obj.stockData = Array(lineCount).fill("••••••").join("\n");

        }

    }

    return obj;

}

/* GET PRODUCTS */

router.get("/", optionalAuth, async(req,res)=>{

try{

const products =
await Product.find()
.sort({ _id:-1 });

res.json(products.map(p => sanitizeProduct(p, req.user)));

}catch(err){

console.log(err);

res.status(500).json(err);

}

});

/* GET SINGLE PRODUCT */

router.get("/:id", optionalAuth, async(req,res)=>{

try{

const product =
await Product.findById(req.params.id);

if(!product){

return res.status(404).json({
message:"Product Not Found"
});

}

res.json(sanitizeProduct(product, req.user));

}catch(err){

res.status(500).json(err);

}

});

/* CREATE PRODUCT — must be logged in as seller/admin */

router.post("/", verifyToken, requireRole("seller", "admin"), async(req,res)=>{

try{

const body = { ...req.body };

// force the product's seller to be whoever is actually logged
// in (unless an admin is deliberately creating it for someone
// else) — otherwise any seller could list products under a
// different seller's name.
if (req.user.role !== "admin") {
    body.seller = req.user.nickname;
}

const product =
new Product(body);

await product.save();

res.json({

message:"Product Added",

product

});

}catch(err){

console.log(err);

res.status(500).json({

message:"Server Error",

error: err.message

});

}

});

/* UPDATE PRODUCT — must be the product's own seller, or admin */

router.put("/:id", verifyToken, async(req,res)=>{

try{

const product = await Product.findById(req.params.id);

if(!product){
return res.status(404).json({ message:"Product Not Found" });
}

const isOwner = req.user.role === "admin" || req.user.nickname === product.seller;

if(!isOwner){
return res.status(403).json({ message:"You don't have permission to edit this product." });
}

const body = { ...req.body };

// don't let a seller reassign their listing to someone else
if (req.user.role !== "admin") {
    delete body.seller;
}

const updatedProduct =
await Product.findByIdAndUpdate(

req.params.id,

body,

{
new:true
}

);

res.json({

message:"Product Updated",

updatedProduct

});

}catch(err){

console.log(err);

res.status(500).json({

message:"Update Error",

error:err.message

});

}

});

/* DELETE PRODUCT — must be the product's own seller, or admin */

router.delete("/:id", verifyToken, async(req,res)=>{

try{

const product = await Product.findById(req.params.id);

if(!product){
return res.status(404).json({ message:"Product Not Found" });
}

const isOwner = req.user.role === "admin" || req.user.nickname === product.seller;

if(!isOwner){
return res.status(403).json({ message:"You don't have permission to delete this product." });
}

await Product.findByIdAndDelete(
req.params.id
);


res.json({
message:"Deleted"
});



}catch(err){

res.status(500).json(err);

}

});

/* PROMOTE PRODUCT — must be the product's own seller, or admin */

router.put("/promote/:id", verifyToken, async(req,res)=>{

try{

const product =
await Product.findById(
req.params.id
);

if(!product){

return res.status(404).json({
message:"Product Not Found"
});

}

const isOwner = req.user.role === "admin" || req.user.nickname === product.seller;

if(!isOwner){
return res.status(403).json({ message:"You don't have permission to promote this product." });
}

product.promoted = true;

product.promotionEnd =
new Date(
Date.now() +
(req.body.days * 24 * 60 * 60 * 1000)
);

await product.save();

res.json({
message:"Product Promoted"
});

}catch(err){

res.status(500).json(err);

}

});

/* GET PROMOTED PRODUCTS */

router.get("/promoted/list", optionalAuth, async(req,res)=>{

try{

const products =
await Product.find({

promoted:true,

promotionEnd:{
$gt:new Date()
}

})

.sort({
promotionEnd:-1
});

res.json(products.map(p => sanitizeProduct(p, req.user)));

}catch(err){

res.status(500).json(err);

}

});

module.exports = router;
