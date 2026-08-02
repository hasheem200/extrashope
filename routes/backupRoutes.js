const express = require("express");
const router = express.Router();
const multer = require("multer");

const { verifyToken, requireRole } = require("../middleware/auth");

const Ad = require("../models/Ad");
const AdminWithdraw = require("../models/AdminWithdraw");
const Advertisement = require("../models/Advertisement");
const Notification = require("../models/Notification");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Review = require("../models/Review");
const Settings = require("../models/Settings");
const Support = require("../models/Support");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Withdraw = require("../models/Withdraw");

/*
  All admin only — this exports/imports the ENTIRE database,
  including user records, orders, and secrets stored in Settings
  (SMTP password, Resend API key, JWT signing secret). Treat any
  exported backup file as sensitive and store it securely.
*/
router.use(verifyToken, requireRole("admin"));

const COLLECTIONS = {
    ads: Ad,
    adminWithdraws: AdminWithdraw,
    advertisements: Advertisement,
    notifications: Notification,
    orders: Order,
    products: Product,
    reviews: Review,
    settings: Settings,
    support: Support,
    // "password" is select:false on the User schema, so a normal
    // find() already excludes it — good, backups never contain
    // password hashes.
    users: User,
    wallets: Wallet,
    withdraws: Withdraw
};

/* ==========================================================
   EXPORT — downloads a single JSON file with every collection
========================================================== */

router.get("/export", async (req, res) => {

    try {

        const backup = {
            exportedAt: new Date().toISOString(),
            version: 1
        };

        for (const [key, Model] of Object.entries(COLLECTIONS)) {

            // User.password is select:false by default, so a plain
            // find() would silently omit it — and since it's also
            // required:true on the schema, restoring that export
            // later would fail validation for every single user.
            const query = key === "users"
                ? Model.find().select("+password")
                : Model.find();

            backup[key] = await query.lean();

        }

        const filename = `extrashope-backup-${new Date().toISOString().slice(0,10)}.json`;

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        res.send(JSON.stringify(backup, null, 2));

    } catch (err) {

        console.log("Backup export failed:", err);
        res.status(500).json({ success:false, message: "Export failed: " + err.message });

    }

});

/* ==========================================================
   IMPORT — restores from a previously exported backup file.
   This REPLACES the current contents of every collection that
   is present in the uploaded file (collections not present in
   the file are left untouched). Requires the request to include
   confirm:"RESTORE" as an extra safety gate against accidental
   uploads wiping live data.
========================================================== */

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/import", upload.single("backup"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({ success:false, message: "No backup file uploaded." });
        }

        if (req.body.confirm !== "RESTORE") {
            return res.status(400).json({ success:false, message: "Restore not confirmed." });
        }

        let data;

        try {
            data = JSON.parse(req.file.buffer.toString("utf-8"));
        } catch (e) {
            return res.status(400).json({ success:false, message: "That file isn't valid JSON." });
        }

        if (typeof data !== "object" || data === null) {
            return res.status(400).json({ success:false, message: "Invalid backup file format." });
        }

        const results = {};
        const errors = {};

        for (const [key, Model] of Object.entries(COLLECTIONS)) {

            if (!Array.isArray(data[key])) continue;

            try {

                await Model.deleteMany({});

                if (data[key].length > 0) {
                    await Model.insertMany(data[key], { ordered: false });
                }

                results[key] = data[key].length;

            } catch (collErr) {

                console.log(`Restore failed for collection "${key}":`, collErr.message);
                errors[key] = collErr.message;

            }

        }

        const success = Object.keys(errors).length === 0;

        res.json({

            success,

            message: success
                ? "Restore complete."
                : "Restore finished with some errors — see details.",

            restored: results,

            errors: Object.keys(errors).length > 0 ? errors : undefined

        });

    } catch (err) {

        console.log("Backup import failed:", err);
        res.status(500).json({ success:false, message: "Restore failed: " + err.message });

    }

});

module.exports = router;
