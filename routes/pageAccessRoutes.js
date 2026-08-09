const express = require("express");
const router = express.Router();

const { verifyToken, requireRole } = require("../middleware/auth");

const PageAccess = require("../models/PageAccess");

/*
  Public on purpose: public/js/page-access.js runs on EVERY page,
  for every visitor (including logged-out ones), to decide whether
  the current page is allowed for their role. It must be readable
  without a token or every page load would fail the check and
  fall back to "no rules" (open) anyway.
*/
router.get("/", async (req, res) => {

    try {

        const rules = await PageAccess.find({});

        res.json(rules);

    } catch (err) {

        res.status(500).json({ message: "Failed to load page access rules." });

    }

});

/*
  Admin only: replaces the whole rule set with whatever the admin
  panel currently has checked. Matches how admin-page-access.html's
  saveAccess() sends it — a full array, not a partial patch.
*/
router.post("/", verifyToken, requireRole("admin"), async (req, res) => {

    try {

        const incoming = req.body;

        if (!Array.isArray(incoming)) {
            return res.status(400).json({ message: "Expected an array of page rules." });
        }

        const clean = incoming
            .filter(item => item && typeof item.path === "string" && item.path.trim() !== "")
            .map(item => ({
                path: item.path.trim(),
                visitor: item.visitor !== false,
                buyer: item.buyer !== false,
                seller: item.seller !== false,
                admin: item.admin !== false
            }));

        await PageAccess.deleteMany({});

        if (clean.length > 0) {
            await PageAccess.insertMany(clean);
        }

        res.json({ success: true });

    } catch (err) {

        res.status(500).json({ message: "Failed to save page access rules." });

    }

});

module.exports = router;
