const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");

/* GET SELLER WALLET */
router.get("/:seller", async(req,res)=>{

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


/* ADD EARNINGS */
router.post("/add", async(req,res)=>{

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

/* PROMOTION PAYMENT */

router.post("/promote", async(req,res)=>{

try{

const {
seller,
amount
} = req.body;

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