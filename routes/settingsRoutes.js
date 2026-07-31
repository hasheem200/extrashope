const express = require("express");

const router = express.Router();

const Settings =
require("../models/Settings");

/* GET */

router.get("/", async(req,res)=>{

let settings = await Settings.findOne();

if(!settings){

settings = await Settings.create({

commission:10,

siteSettings:{}

});

}

res.json(settings);

});



router.put("/site", async(req,res)=>{

let settings = await Settings.findOne();

if(!settings){

settings = new Settings();

}

settings.siteSettings = {

...(settings.siteSettings || {}),

...req.body

};

await settings.save();

res.json({

message:"Website Settings Saved",

settings

});

});    

/* UPDATE */

router.put("/", async(req,res)=>{

let settings =
await Settings.findOne();

if(!settings){

settings =
new Settings();
}

settings.commission =
Number(req.body.commission);

await settings.save();

res.json({
message:"Updated",
settings
});

});


router.get("/admin-wallet", async (req,res)=>{

    let settings = await Settings.findOne();

    if(!settings){

        settings = await Settings.create({

            commission:10,

            adminWallet:0,

            adsRevenue:0

        });

    }

    res.json({

        wallet:Number(settings.adminWallet || 0),

        adsRevenue:Number(settings.adsRevenue || 0)

    });

});

router.get("/debug-settings", async (req,res)=>{

const all = await Settings.find();

res.json(all);

});

module.exports = router;