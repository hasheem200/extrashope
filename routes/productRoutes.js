const express = require("express");

const router = express.Router();

const Product =
require("../models/Product");

/* GET PRODUCTS */

router.get("/", async(req,res)=>{

try{

const products =
await Product.find()
.sort({ _id:-1 });

res.json(products);

}catch(err){

console.log(err);

res.status(500).json(err);

}

});

/* CREATE PRODUCT */

router.post("/", async(req,res)=>{

try{

const product =
new Product(req.body);

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

/* UPDATE PRODUCT */

router.put("/:id", async(req,res)=>{

try{

const updatedProduct =
await Product.findByIdAndUpdate(

req.params.id,

req.body,

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

/* DELETE PRODUCT */

router.delete("/:id", async(req,res)=>{

try{

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

/* PROMOTE PRODUCT */

router.put("/promote/:id", async(req,res)=>{

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

router.get("/promoted/list", async(req,res)=>{

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

res.json(products);

}catch(err){

res.status(500).json(err);

}

});

module.exports = router;