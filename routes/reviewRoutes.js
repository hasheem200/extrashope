const express = require("express");
const router = express.Router();

const Review =
require("../models/Review");

const { verifyToken } = require("../middleware/auth");

/* ADD REVIEW — must be logged in (prevents anonymous fake-review spam) */

router.post("/", verifyToken, async(req,res)=>{

try{

const review =
new Review({
    ...req.body,
    user: req.user.nickname // trust the token, not the request body
});

await review.save();

res.json({
success:true
});

}catch(err){

res.status(500).json(err);

}

});

/* GET PRODUCT REVIEWS — public */

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
