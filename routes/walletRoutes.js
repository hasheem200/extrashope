const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");
const { verifyToken, requireRole, requireSelfOrAdmin } = require("../middleware/auth");

/* GET SELLER WALLET — owner or admin only */
router.get("/:seller", verifyToken, requireSelfOrAdmin(req => req.params.seller), async(req,res)=>{

 try{

  let wallet = await Wallet.findOne({
   seller:req.params.seller
  });

  if(!wallet){

   wallet = new Wallet({
    seller:req.params.seller
   });

   await wallet.save();
  }

  res.json(wallet);

 }catch(err){

  res.status(500).json(err);

 }

});


/* ADD EARNINGS — admin only (this credits real money; should never
   be user-triggered directly) */
router.post("/add", verifyToken, requireRole("admin"), async(req,res)=>{

 try{

  const { seller, amount } = req.body;

  let wallet =
  await Wallet.findOne({ seller });

  if(!wallet){
   wallet = new Wallet({ seller });
  }

  wallet.balance += Number(amount);
  wallet.totalEarned += Number(amount);

  await wallet.save();

  res.json({
   message:"Earnings Added",
   wallet
  });

 }catch(err){

  res.status(500).json(err);

 }

 

});

/* PROMOTION PAYMENT — must be the wallet owner, or admin */

router.post("/promote", verifyToken, async(req,res)=>{

try{

const {
seller,
amount
} = req.body;

if(req.user.role !== "admin" && req.user.nickname !== seller){
return res.status(403).json({ message:"You don't have permission to do that." });
}

const wallet =
await Wallet.findOne({
seller
});

if(!wallet){

return res.status(404).json({
message:"Wallet Not Found"
});

}

if(wallet.balance < amount){

return res.status(400).json({
message:"Insufficient Balance"
});

}

wallet.balance -= Number(amount);

await wallet.save();

res.json({

success:true,

message:"Promotion Activated",

wallet

});

}catch(err){

res.status(500).json(err);

}

});

module.exports = router;
