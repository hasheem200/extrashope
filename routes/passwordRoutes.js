const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const mailerFactory = require("../config/mailerFactory");
const Settings = require("../models/Settings");

/*
  ==============================================================
  Password reset now works with a 6-digit CODE emailed to the
  user (instead of only a click-through link), as requested:
  1) POST /forgot        { email }           -> emails a 6-digit code
  2) POST /verify-code   { email, code }     -> confirms the code is valid
  3) POST /reset         { email, code, password } -> sets new password

  The old link-based /reset (token in URL) still works too, so
  nothing that depended on it breaks.
  ==============================================================
*/

/* FORGOT PASSWORD — sends a 6-digit code */

router.post("/forgot", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ message: "Email not found" });
        }

        const settings = await Settings.findOne();

        if (!settings || !settings.siteSettings ||
            !settings.siteSettings.smtpUser || !settings.siteSettings.smtpPass) {

            return res.status(500).json({
                message: "Email is not configured on the server (SMTP user/pass missing in Admin → Website Settings)."
            });

        }

        // 6-digit numeric code, valid for 10 minutes
        const code = String(crypto.randomInt(100000, 999999));

        // also keep a token for the old link-based flow (backward compatible)
        const token = crypto.randomBytes(32).toString("hex");

        user.resetToken = token;
        user.resetCode = code;
        user.resetExpire = Date.now() + 1000 * 60 * 10;

        await user.save();

        const siteUrl =
            settings.siteSettings.siteUrl || `${req.protocol}://${req.get("host")}`;

        const link = `${siteUrl}/reset-password?token=${token}`;

        console.log("RESET CODE for", user.email, "=", code);

        // Respond immediately — don't make the user wait on Gmail's
        // handshake. Email goes out in the background below.
        res.json({ message: "A verification code has been sent to your email." });

        sendCodeEmail({ settings, user, code, link });

    } catch (err) {

        console.log(err);
        res.status(500).json(err);

    }

});

/* Background sender, with the built-in 465→587 fallback + logging */

async function sendCodeEmail({ settings, user, code, link }) {

    try {

        await mailerFactory.sendMail({

            to: user.email,

            subject: "Your Password Reset Code",

            html: `
<h2>Hello ${user.nickname}</h2>

<p>Your password reset code is:</p>

<div style="font-size:32px;font-weight:bold;letter-spacing:6px;
background:#f5f5f5;padding:16px 24px;border-radius:8px;
display:inline-block;color:#00c853;">
${code}
</div>

<p style="margin-top:16px;">This code expires in 10 minutes.</p>

<p>Or click the button below instead:</p>

<a href="${link}"
style="padding:12px 20px;background:#00c853;color:white;
text-decoration:none;border-radius:6px;display:inline-block;">
Reset Password
</a>
`

        });

    } catch (err) {

        console.log(`⚠️  Could not deliver reset code to ${user.email}:`, err.message);

    }

}

/* VERIFY CODE — lets the frontend check the code before showing the password field */

router.post("/verify-code", async (req, res) => {

    try {

        const { email, code } = req.body;

        const user = await User.findOne({
            email,
            resetCode: code,
            resetExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.json({ success: false, message: "Invalid or expired code" });
        }

        res.json({ success: true, message: "Code verified" });

    } catch (err) {

        console.log(err);
        res.status(500).json(err);

    }

});

/* RESET PASSWORD — by code (new) or by token (old links, still supported) */

router.post("/reset", async (req, res) => {

    try {

        const { token, email, code, password } = req.body;

        if (!password || password.length < 6) {
            return res.json({ message: "Password must be at least 6 characters" });
        }

        let user = null;

        if (code && email) {

            user = await User.findOne({
                email,
                resetCode: code,
                resetExpire: { $gt: Date.now() }
            });

        } else if (token) {

            user = await User.findOne({
                resetToken: token,
                resetExpire: { $gt: Date.now() }
            });

        }

        if (!user) {
            return res.json({ message: "Invalid or expired link" });
        }

        user.password = await bcrypt.hash(password, 10);

        user.resetToken = undefined;
        user.resetCode = undefined;
        user.resetExpire = undefined;

        await user.save();

        res.json({ message: "Password updated successfully" });

    } catch (err) {

        console.log(err);
        res.status(500).json(err);

    }

});

module.exports = router;
