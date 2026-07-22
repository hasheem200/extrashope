const express = require("express");
const router = express.Router();

const Review =
require("../models/Review");

/* ADD REVIEW */

router.post("/",async(req,res)=>{

try{

const review =
new Review(req.body);

await review.save();

res.json({
success:true
});

}catch(err){

res.status(500).json(err);

}

});

/* GET PRODUCT REVIEWS */

router.get("/:productId",async(req,res)=>{

try{

const reviews =
await Review.find({

productId:req.params.productId

}).sort({

createdAt:-1

});

res.json(reviews);

}catch(err){

res.status(500).json(err);

}

});

module.exports = router;