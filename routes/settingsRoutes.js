const express = require("express");

const router = express.Router();

const Settings =
require("../models/Settings");

const { verifyToken, requireRole } = require("../middleware/auth");

/*
  SECURITY: Settings holds real secrets — Gmail App Password,
  Resend API key, cloud storage API secret, and the JWT signing
  secret itself. The old code returned the ENTIRE document on a
  public, unauthenticated GET, and even had a "/debug-settings"
  endpoint that dumped it a second time. Both leaked every secret
  in this app to anyone who visited the URL.

  Fix: GET / is still public (pages need siteName/logo/meta/etc.
  to render), but secrets are stripped out before sending. A new
  GET /full (admin-only) returns everything, for the admin panel.
*/
function stripSecrets(settingsDoc) {

    const obj = settingsDoc.toObject ? settingsDoc.toObject() : settingsDoc;

    if (obj.siteSettings) {

        delete obj.siteSettings.smtpPass;
        delete obj.siteSettings.resendApiKey;

    }

    delete obj.jwtSecret;

    if (obj.storageSettings) {
        delete obj.storageSettings.cloudApiSecret;
    }

    return obj;

}

/* GET — public, secrets stripped */

router.get("/", async(req,res)=>{

let settings = await Settings.findOne();

if(!settings){

settings = await Settings.create({

commission:10,

siteSettings:{}

});

}

res.json(stripSecrets(settings));

});

/* GET FULL — admin only, includes secrets, used by the admin settings page */

router.get("/full", verifyToken, requireRole("admin"), async(req,res)=>{

let settings = await Settings.findOne();

if(!settings){

settings = await Settings.create({

commission:10,

siteSettings:{}

});

}

res.json(settings);

});



router.put("/site", verifyToken, requireRole("admin"), async (req, res) => {

    let settings = await Settings.findOne();

    if (!settings) {

        settings = new Settings();

    }

    settings.siteSettings = {

        ...(settings.siteSettings || {}),

        ...(req.body.siteSettings || {})

    };

    // BUG FIX: storageSettings is a top-level sibling field on the
    // Settings schema (not nested inside siteSettings), and that's
    // also where uploadRoutes.js and fileManagerRoutes.js actually
    // read Storage Type/Cloud Name/API Key/Secret from. Saving it
    // nested here (the old behavior) meant it always landed
    // somewhere nothing ever reads — Storage Settings changes from
    // the admin panel would silently have zero effect, which would
    // make the Cloudinary File Manager feature unreachable (valid
    // credentials could never actually be saved).
    settings.storageSettings = {

        ...(settings.storageSettings || {}),

        ...(req.body.storageSettings || {})

    };

    await settings.save();

    res.json({

        message: "Website Settings Saved",

        settings: stripSecrets(settings)

    });

}); 

/* UPDATE COMMISSION — admin only */

router.put("/", verifyToken, requireRole("admin"), async(req,res)=>{

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
settings: stripSecrets(settings)
});

});


router.get("/admin-wallet", verifyToken, requireRole("admin"), async (req,res)=>{

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

// NOTE: the old "/debug-settings" endpoint that dumped every secret
// in the database with zero authentication has been removed entirely.

module.exports = router;
