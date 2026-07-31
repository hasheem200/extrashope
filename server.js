const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const User = require("./models/User");
const Settings = require("./models/Settings");
const settingsRoutes = require("./routes/settingsRoutes");
const Advertisement = require("./models/Advertisement");


const app = express();


/* MIDDLEWARE */

app.use(express.json());

app.use(express.static(
path.join(__dirname,"public")
));


/* MONGODB */



mongoose.connect(
"mongodb://hasheem2005:hasheem2005@ac-pnnb30o-shard-00-00.vg3kqox.mongodb.net:27017,ac-pnnb30o-shard-00-01.vg3kqox.mongodb.net:27017,ac-pnnb30o-shard-00-02.vg3kqox.mongodb.net:27017/amazon?ssl=true&replicaSet=atlas-i75yrt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=amazon"
)
.then(()=>{
  console.log("MongoDB Connected");
})
.catch(err=>{
  console.log("MongoDB Error:");
  console.log(err);
});


/* ROUTES */

const productRoutes =
require("./routes/productRoutes");

const userRoutes =
require("./routes/userRoutes");

const uploadRoutes =
require("./routes/uploadRoutes");

const orderRoutes =
require("./routes/orderRoutes");

const walletRoutes =
require("./routes/walletRoutes");

const withdrawRoutes =
require("./routes/withdrawRoutes");

const notificationRoutes =
require("./routes/notificationRoutes");

const passwordRoutes =
require("./routes/passwordRoutes");

const reviewRoutes =
require("./routes/reviewRoutes");

const adminWithdrawRoutes =
require("./routes/adminWithdrawRoutes");

const Support = require("./models/Support");

const fileManagerRoutes =
require("./routes/fileManagerRoutes");

const robotsRoutes =
require("./routes/robotsRoutes");

const sitemapRoutes =
require("./routes/sitemapRoutes");



/* API */

app.use("/api/products", productRoutes);

app.use("/api/users", userRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/wallet", walletRoutes);

app.use("/api/withdraws", withdrawRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/password", passwordRoutes);

app.use("/api/reviews",reviewRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/admin-withdraws", adminWithdrawRoutes);

app.use("/api/file-manager",fileManagerRoutes);

app.use("/robots.txt", robotsRoutes);

app.use("/sitemap.xml", sitemapRoutes);

/* HOME */

app.get("/",(req,res)=>{

res.sendFile(

path.join(

__dirname,

"public",

"index.html"
)
);

});

app.post("/api/support", async (req, res) => {

    console.log("BODY =", req.body);

    try{

        console.log(req.body);

        const support = new Support(req.body);

        await support.save();

        res.json({
            success:true
        });

    }catch(err){

        res.status(500).json(err);

    }

});

app.get("/api/support", async (req, res) => {

    try{

        const supports = await Support.find().sort({
            createdAt:-1
        });

        res.json(supports);

    }catch(err){

        res.status(500).json(err);

    }

});

app.put("/api/payment-settings", async(req,res)=>{

    let settings =
    await Settings.findOne();

    if(!settings){

        settings =
        await Settings.create({});

    }

    settings.paymentSettings = req.body;

    await settings.save();

    res.json({

        success:true

    });

});

app.put("/api/support/:id", async (req,res)=>{

    try{

        await Support.findByIdAndUpdate(

            req.params.id,

            {
                reply:req.body.reply,
                status:req.body.status || "Closed"
            }

        );

        res.json({
            success:true
        });

    }catch(err){

        res.status(500).json(err);

    }

});

/* ========================= */
/* ADVERTISEMENTS API */
/* ========================= */

/* CREATE */

app.post("/api/ads", async (req,res)=>{

    try{

        const ad = new Advertisement(req.body);

        await ad.save();

        res.json({
            success:true
        });

    }catch(err){

        console.log(err);

        res.status(500).json(err);

    }

});

/* GET ALL */

app.get("/api/ads", async (req,res)=>{

    try{

        const ads = await Advertisement.find().sort({
            createdAt:-1
        });

        res.json(ads);

    }catch(err){

        res.status(500).json(err);

    }

});

/* UPDATE */

app.put("/api/ads/:id", async (req,res)=>{

    const ad = await Advertisement.findById(req.params.id);

    if(!ad){

        return res.json({
            success:false
        });

    }

   if(req.body.status === "Approved" && ad.status !== "Approved"){

    let settings = await Settings.findOne();

    if(!settings){

        settings = await Settings.create({

            commission:10,

            adminWallet:0,

            adsRevenue:0

        });

    }

    settings.adsRevenue += Number(ad.price || 0);

    await settings.save();

    // بداية الإعلان
    ad.approvedAt = new Date();

    // نهاية الإعلان
    ad.expiresAt = new Date(
        Date.now() + (Number(ad.days) * 24 * 60 * 60 * 1000)
    );

}

    ad.status = req.body.status;

    await ad.save();

    res.json({

        success:true

    });

});



app.post("/api/users/promote", async (req, res) => {

    const { seller, amount } = req.body;

    console.log("Seller =", seller);

const allUsers = await User.find();

console.log(allUsers.map(u => u.nickname));

const user = await User.findOne({
    
    nickname: seller
});

// ===============================
// Auto Unblock
// ===============================

if(user.blocked){

if(user.blockUntil && new Date(user.blockUntil) <= new Date()){

user.blocked = false;
user.blockUntil = null;
user.blockReason = "";

await user.save();

}

}


console.log("User =", user);

    if (!user) {
        return res.json({
            success: false,
            message: "User not found"
        });
    }

    if (user.wallet < amount) {
        return res.json({
            success: false,
            message: "Insufficient Balance"
        });
    }

    user.wallet -= amount;
await user.save();

/* Admin Wallet */

let settings = await Settings.findOne();

if (!settings) {

    settings = await Settings.create({
        commission: 10,
        adminWallet: 0
    });

}

settings.adminWallet = Number(settings.adminWallet || 0) + Number(amount);

console.log("Before Save =", settings.adminWallet);

await settings.save();

const check = await Settings.findOne();

console.log("After Save =", check.adminWallet);

res.json({
    success: true,
    message: "Promotion Paid"
});

});

app.get("/api/admin/stats", async (req, res) => {

    try {

        const buyers = await User.countDocuments({
            role: "buyer"
        });

        const sellers = await User.countDocuments({
            role: "seller"
        });

        res.json({
            buyers,
            sellers
        });

    } catch (err) {

        res.status(500).json({
            buyers: 0,
            sellers: 0
        });

    }

});

app.get("/api/admin/stats", async (req, res) => {

    try {

        const buyers = await User.countDocuments({
            role: "user"
        });

        const sellers = await User.countDocuments({
            role: "seller"
        });

        res.json({
            buyers,
            sellers
        });

    } catch (err) {

        res.status(500).json({
            buyers: 0,
            sellers: 0
        });

    }

});

app.get("/api/admin/stats", async (req, res) => {

    const users = await User.find();

    users.forEach(u=>{
        console.log(u.nickname, u.role);
    });

    res.json(users);

});

/* ==========================
   BANNER PRICES
========================== */

app.get("/api/banner-prices", async (req,res)=>{

    let settings = await Settings.findOne();

    if(!settings){

        settings = await Settings.create({

            commission:10,

            adminWallet:0,

            adsRevenue:0,

            bannerPrices:{

                top:5,

                long:4,

                large:3,

                rectangle:2,

                mobile:1

            }

        });

    }

    res.json(settings.bannerPrices);

});

app.put("/api/banner-prices", async (req,res)=>{

    let settings = await Settings.findOne();

    if(!settings){

        settings = await Settings.create({

            commission:10,

            adminWallet:0,

            adsRevenue:0,

            bannerPrices:req.body

        });

    }else{

        settings.bannerPrices = req.body;

        await settings.save();

    }

    res.json({

        success:true

    });

});

/* SERVER */

const PORT = 5001;

app.listen(PORT,"0.0.0.0",()=>{

console.log(`Server Running on ${PORT}`);

});


app.get("/api/settings/admin-wallet", async (req,res)=>{

    try{

        const settings = await Settings.findOne();

        if(!settings){

            return res.json({

                wallet:0,

                adsRevenue:0

            });

        }

        res.json({

            wallet:Number(settings.adminWallet || 0),

            adsRevenue:isNaN(Number(settings.adsRevenue))
    ? 0
    : Number(settings.adsRevenue)

        });

    }catch(err){

        res.json({

            wallet:0,

            adsRevenue:0

        });

    }

});

app.get("/api/ads/live", async (req, res) => {

    try {

        const ads = await Advertisement.find({

    status:"Approved",

    expiresAt:{
        $gt:new Date()
    }

});

        res.json(ads);

    } catch (err) {

        res.status(500).json([]);

    }

});

app.get("/api/ads/live", async (req,res)=>{

    const ads = await Advertisement.find({
        status:"Approved"
    });

    console.log("LIVE ADS =", ads);

    res.json(ads);

});

app.get("/api/payment-settings", async(req,res)=>{

    const settings =
    await Settings.findOne();

    res.json(settings.paymentSettings);

});

/* END */
 

