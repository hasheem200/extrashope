const express = require("express");
const router = express.Router();

const Settings = require("../models/Settings");

router.get("/", async (req, res) => {

    const settings = await Settings.findOne();

    const siteUrl =
        settings?.siteSettings?.siteUrl || "http://localhost:5001";

    res.type("text/plain");

    res.send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`);

});

module.exports = router;