const nodemailer = require("nodemailer");
const Settings = require("../models/Settings");

/*
  ==============================================================
  Mailer with automatic HTTP fallback.

  Confirmed on Railway logs: outbound SMTP (ports 465 AND 587) is
  blocked at the network level (ENETUNREACH / Connection timeout).
  This is Railway's own network policy on shared/hobby infra —
  no application code can force a raw SMTP connection through it.

  Fix: if a Resend API key is configured (Admin → Website Settings
  → "Resend API Key"), emails are sent over Resend's HTTP API
  (port 443 — same port normal web traffic uses, never blocked).
  If no Resend key is set, it falls back to direct Gmail SMTP
  (465 → 587) for hosts that don't block SMTP.
  ==============================================================
*/

async function getSmtpSettings() {

    const settings = await Settings.findOne();

    if (!settings || !settings.siteSettings) {
        throw new Error("Website settings not found in database.");
    }

    return { settings, smtp: settings.siteSettings };

}

function buildTransport(smtp, port) {

    return nodemailer.createTransport({

        host: "smtp.gmail.com",
        port,
        secure: port === 465,

        auth: {
            user: smtp.smtpUser,
            pass: smtp.smtpPass
        },

        pool: true,
        maxConnections: 3,
        maxMessages: 50,

        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000

    });

}

/* Backward-compatible: default transport (465) */
async function getMailer() {

    const { smtp } = await getSmtpSettings();

    if (!smtp.smtpUser || !smtp.smtpPass) {
        throw new Error("SMTP settings are missing (set SMTP user/pass in Admin → Website Settings).");
    }

    return buildTransport(smtp, 465);

}

/* Send via Resend's HTTP API (works over port 443, never blocked) */
async function sendViaResend(smtp, senderName, mailOptions) {

    // Resend's shared "onboarding@resend.dev" sender works out of the
    // box with no domain setup. Once a custom domain is verified in
    // the Resend dashboard, swap this for e.g. "noreply@yourdomain.com".
    const fromAddress = smtp.resendFromEmail || "onboarding@resend.dev";

    const response = await fetch("https://api.resend.com/emails", {

        method: "POST",

        headers: {
            "Authorization": `Bearer ${smtp.resendApiKey}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            from: `${senderName} <${fromAddress}>`,
            to: [mailOptions.to],
            subject: mailOptions.subject,
            html: mailOptions.html
        })

    });

    if (!response.ok) {

        const errText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errText}`);

    }

    return await response.json();

}

/*
  sendMail(mailOptions) — use this for anything new.
  1) If Resend API key is set -> send via Resend HTTP API (recommended
     for Railway/Render/similar hosts that block SMTP).
  2) Otherwise -> try Gmail SMTP on port 465, then 587.
*/
async function sendMail(mailOptions) {

    const { settings, smtp } = await getSmtpSettings();

    const senderName = settings.siteSettings.senderName || "ExtraShope";

    if (smtp.resendApiKey) {

        try {

            await sendViaResend(smtp, senderName, mailOptions);

            console.log(`✅ Email sent to ${mailOptions.to} via Resend`);

            return { success: true, via: "resend" };

        } catch (err) {

            console.log(`❌ Resend send failed:`, err.message);

            throw new Error(
                `Resend email failed: ${err.message}. Check that the Resend API key is valid.`
            );

        }

    }

    // No Resend key configured -> fall back to direct Gmail SMTP

    if (!smtp.smtpUser || !smtp.smtpPass) {
        throw new Error("SMTP settings are missing (set SMTP user/pass, or better, a Resend API key, in Admin → Website Settings).");
    }

    const from = mailOptions.from ||
        `${senderName} <${smtp.smtpUser}>`;

    const finalOptions = { ...mailOptions, from };

    const ports = [465, 587];
    const errors = [];

    for (const port of ports) {

        try {

            const transporter = buildTransport(smtp, port);

            await transporter.sendMail(finalOptions);

            console.log(`✅ Email sent to ${finalOptions.to} via SMTP port ${port}`);

            return { success: true, via: `smtp-${port}` };

        } catch (err) {

            console.log(`❌ Email via port ${port} failed:`, err.message);

            errors.push(`port ${port}: ${err.message}`);

        }

    }

    throw new Error(
        `Could not send email via SMTP on either port 465 or 587. ` +
        `This almost always means the hosting provider is blocking ` +
        `outbound SMTP traffic — add a Resend API key in Website Settings ` +
        `to fix this. Details -> ${errors.join(" | ")}`
    );

}

module.exports = getMailer;
module.exports.getMailer = getMailer;
module.exports.sendMail = sendMail;
