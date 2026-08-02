const express = require("express");
const router = express.Router();

const AdminWithdraw = require("../models/AdminWithdraw");
const Settings = require("../models/Settings");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken, requireRole("admin"));

/* CREATE ADMIN WITHDRAW */

router.post("/", async (req, res) => {

    try {

        const { amount, method, address, source } = req.body;

        let settings = await Settings.findOne();

        if (!settings) {
            return res.json({
                success: false,
                message: "Settings Not Found"
            });
        }

        if(source === "ads"){

    if(Number(settings.adsRevenue || 0) < Number(amount)){

        return res.json({

            success:false,

            message:"Insufficient Ads Revenue"

        });

    }

    settings.adsRevenue -= Number(amount);

}else{

    if(Number(settings.adminWallet || 0) < Number(amount)){

        return res.json({

            success:false,

            message:"Insufficient Admin Wallet"

        });

    }

    settings.adminWallet -= Number(amount);

}

await settings.save();

        const withdraw = await AdminWithdraw.create({

            amount,
            method,
            address,
            source,
            status: "Pending ⏳"

        });

        res.json({
            success: true,
            message: "Withdraw Request Created",
            withdraw
        });

    } catch (err) {

        res.status(500).json(err);

    }

});

/* GET ALL */

router.get("/", async (req, res) => {

    const list =
    await AdminWithdraw.find().sort({
        createdAt: -1
    });

    res.json(list);

});

/* APPROVE */

router.put("/:id/approve", async (req, res) => {

    try {

        const withdraw =
        await AdminWithdraw.findById(req.params.id);

        if (!withdraw) {

            return res.json({
                message:"Withdraw Not Found"
            });

        }

        withdraw.status = "Approved ✅";

        await withdraw.save();

        res.json({
            message:"Approved"
        });

    } catch(err){

        res.status(500).json(err);

    }

});


/* REJECT */

router.put("/:id/reject", async (req,res)=>{

    try{

        const withdraw =
        await AdminWithdraw.findById(req.params.id);

        if(!withdraw){

            return res.json({
                message:"Withdraw Not Found"
            });

        }

        if(withdraw.status === "Rejected ❌"){

            return res.json({
                message:"Already Rejected"
            });

        }

        let settings =
        await Settings.findOne();

        if(withdraw.source === "ads"){

    settings.adsRevenue =
    Number(settings.adsRevenue || 0)
    + Number(withdraw.amount);

}else{

    settings.adminWallet =
    Number(settings.adminWallet || 0)
    + Number(withdraw.amount);

}

        await settings.save();

        withdraw.status = "Rejected ❌";

        await withdraw.save();

        res.json({
            message:"Rejected"
        });

    }catch(err){

        res.status(500).json(err);

    }

});

module.exports = router;