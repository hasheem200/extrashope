/* DEPLOYMENT: loads variables from a local .env file (if present)
   into process.env — needed for MONGO_URI/PORT/NODE_ENV to work
   during local development. On Railway/most hosts this is a no-op
   since they inject environment variables directly, but it's what
   makes the same code work the same way locally too. "dotenv" was
   already a listed dependency but was never actually loaded. */
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const compression = require("compression");
const User = require("./models/User");
const Settings = require("./models/Settings");
const settingsRoutes = require("./routes/settingsRoutes");
const Advertisement = require("./models/Advertisement");
const { verifyToken, requireRole } = require("./middleware/auth");
const notifyAdmin = require("./utils/notifyAdmin");


const app = express();


/* MIDDLEWARE */

/* PERFORMANCE: gzip/br-compress every response (HTML, JSON, CSS, JS).
   This alone typically cuts page-load transfer size by 60-80% —
   the single biggest, lowest-risk win for load speed. */
app.use(compression());

/* DEPLOYMENT: force HTTPS in production. Railway (and most PaaS)
   terminate SSL at their edge and forward plain HTTP internally,
   setting the "x-forwarded-proto" header so the app can tell what
   the original request used. This redirects any stray HTTP request
   to HTTPS — a no-op locally (no x-forwarded-proto header) and a
   no-op if the request already arrived as HTTPS. */
app.use((req, res, next) => {

    if (
        process.env.NODE_ENV === "production" &&
        req.headers["x-forwarded-proto"] === "http"
    ) {
        return res.redirect(301, "https://" + req.headers.host + req.url);
    }

    next();

});

/* DEPLOYMENT: lightweight health check for the hosting platform's
   uptime monitor — deliberately does NOT touch the database, so it
   still responds even if MongoDB is temporarily unreachable, which
   is exactly when you want a health check to be informative. */
app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

app.use(express.json());

/* ==========================
   CLEAN URLs (remove .html)
   Old links like /product.html?id=1 still work,
   but get redirected (301) to /product?id=1
========================== */

app.get(/^\/(.+)\.html$/, (req, res) => {

    const clean = req.params[0];

    const query = req.url.includes("?")
        ? req.url.slice(req.url.indexOf("?"))
        : "";

    res.redirect(301, "/" + clean + query);

});

app.use(express.static(
path.join(__dirname,"public"),
{
    extensions: ["html"], // /product now resolves to product.html on disk

    /* PERFORMANCE: cache static assets so the browser doesn't
       re-download them on every visit.
       - Images/uploads: long cache (7 days) — filenames are
         timestamp-based, so a new upload is always a new URL.
       - CSS/JS: short cache (10 min) — this project is still
         being actively edited, so a long cache here would hide
         your own fixes from your browser after each deploy.
       - HTML: no cache — always revalidate, pages change often. */
    setHeaders: (res, filePath) => {

        if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.endsWith(".css") || filePath.endsWith(".js")) {
            res.setHeader("Cache-Control", "public, max-age=600"); // 10 minutes
        } else {
            res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
        }

    }
}
));


/* MONGODB */

/* DEPLOYMENT: this connection string used to be hardcoded directly
   in the source code (with real credentials) — meaning anyone with
   access to the GitHub repo could see the database password. Now
   it reads from the MONGO_URI environment variable if set (add it
   in Railway → Variables), and only falls back to the old hardcoded
   value if that variable isn't set, so nothing breaks if you don't
   set it right away. Recommended: set MONGO_URI and consider
   rotating this password since it has been sitting in the repo. */

const MONGO_URI = process.env.MONGO_URI ||
"mongodb://hasheem2005:hasheem2005@ac-pnnb30o-shard-00-00.vg3kqox.mongodb.net:27017,ac-pnnb30o-shard-00-01.vg3kqox.mongodb.net:27017,ac-pnnb30o-shard-00-02.vg3kqox.mongodb.net:27017/amazon?ssl=true&replicaSet=atlas-i75yrt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=amazon";

mongoose.connect(
MONGO_URI
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

const backupRoutes =
require("./routes/backupRoutes");

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

app.use("/api/backup",backupRoutes);

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

        notifyAdmin({
            type: "warning",
            title: "New Support Ticket",
            message: `${support.seller} (${support.role}) submitted a support request: "${support.subject}"`,
            details: {
                From: support.seller,
                Role: support.role,
                Subject: support.subject,
                Message: support.message
            },
            actionUrl: `${req.protocol}://${req.get("host")}/admin-support`,
            actionLabel: "Reply to Ticket"
        });

        res.json({
            success:true
        });

    }catch(err){

        res.status(500).json(err);

    }

});

/* SECURITY: contact/support messages contain personal info
   (name, email, message) — admin only to view. */
app.get("/api/support", verifyToken, requireRole("admin"), async (req, res) => {

    try{

        const supports = await Support.find().sort({
            createdAt:-1
        });

        res.json(supports);

    }catch(err){

        res.status(500).json(err);

    }

});

/* SECURITY: payment settings hold the store's real payout
   address — admin only to change. */
app.put("/api/payment-settings", verifyToken, requireRole("admin"), async(req,res)=>{

    let settings =
    await Settings.findOne();

    if(!settings){

        settings =
        await Settings.create({});

    }

    // BUG FIX: this used to be a blind replace
    // ("settings.paymentSettings = req.body"), which meant any
    // field NOT included in a given save request (like "logo" and
    // "qr", which this form doesn't even have inputs for) got
    // silently wiped back to its default every single time this
    // page saved. Now it merges instead, so nothing gets lost.
    settings.paymentSettings = {

        ...(settings.paymentSettings || {}),

        ...req.body

    };

    await settings.save();

    res.json({

        success:true

    });

});

app.put("/api/support/:id", verifyToken, requireRole("admin"), async (req,res)=>{

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

/* CREATE — must be logged in */

app.post("/api/ads", verifyToken, async (req,res)=>{

    try{

        const ad = new Advertisement({
            ...req.body,
            advertiser: req.user.nickname // trust the token, not the body
        });

        await ad.save();

        res.json({
            success:true
        });

    }catch(err){

        console.log(err);

        res.status(500).json(err);

    }

});

/* GET ALL — admin only (management list; public-facing ads use /api/ads/live) */

app.get("/api/ads", verifyToken, requireRole("admin"), async (req,res)=>{

    try{

        const ads = await Advertisement.find().sort({
            createdAt:-1
        });

        res.json(ads);

    }catch(err){

        res.status(500).json(err);

    }

});

/* UPDATE (approve/reject) — admin only: this credits the admin wallet */

app.put("/api/ads/:id", verifyToken, requireRole("admin"), async (req,res)=>{

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



app.post("/api/users/promote", verifyToken, async (req, res) => {

    const { seller, amount } = req.body;

    // SECURITY: this deducts real money from a wallet — it must
    // only ever be the logged-in user's own wallet, never one
    // picked arbitrarily from the request body.
    if(req.user.role !== "admin" && req.user.nickname !== seller){
        return res.status(403).json({
            success:false,
            message:"You don't have permission to do that."
        });
    }

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

/* SECURITY: this used to be defined 3 times (Express only uses
   the first match, so the other 2 were dead code) and had zero
   auth — anyone could dump every user account. Now one route,
   admin only. */

app.get("/api/admin/stats", verifyToken, requireRole("admin"), async (req, res) => {

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

app.put("/api/banner-prices", verifyToken, requireRole("admin"), async (req,res)=>{

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

/* DEPLOYMENT: most hosting platforms (Railway, Render, Heroku,
   etc.) assign a port dynamically via the PORT environment
   variable and route traffic to whatever port the app actually
   listens on — a hardcoded port can silently break routing on
   some platforms. Falls back to 5001 for local development. */
const PORT = process.env.PORT || 5001;

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

/* SECURITY: this is called publicly by the checkout pages to show
   buyers where to pay — it must never include the admin's private
   notification email. */
app.get("/api/payment-settings", async(req,res)=>{

    const settings =
    await Settings.findOne();

    const payment = { ...(settings.paymentSettings?.toObject ? settings.paymentSettings.toObject() : settings.paymentSettings) };

    delete payment.notificationEmail;

    res.json(payment);

});

/* Admin-only — includes notificationEmail, used by the admin
   Payment Settings page to populate its own edit form. */
app.get("/api/payment-settings/full", verifyToken, requireRole("admin"), async(req,res)=>{

    const settings =
    await Settings.findOne();

    res.json(settings.paymentSettings);

});

/* END */
 

