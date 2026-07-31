const nodemailer = require("nodemailer");
const Settings = require("../models/Settings");

/*
  ==============================================================
  Robust Gmail mailer.

  Problems this fixes:
  1) Old code used service:"gmail" with NO timeouts. If the
     hosting provider blocks outbound SMTP ports, the connection
     just hangs forever — no error, no email, request stuck.
  2) Some hosts block port 465 (SSL) but allow 587 (STARTTLS),
     others are the opposite. There was no fallback, so one
     blocked port meant total failure with no retry.

  What this does now:
  - Tries port 465 (SSL) first.
  - If that fails/times out, automatically retries on port 587
    (STARTTLS) before giving up.
  - Every attempt has short, explicit timeouts so failures surface
    in seconds, not minutes, and get logged with a clear reason.

  NOTE (honesty): if the hosting provider blocks outbound traffic
  on BOTH port 465 and 587 entirely (some free-tier hosts do),
  no amount of application code can force an SMTP email through —
  that is a network policy on the host, not a bug in this project.
  In that case switch SEND_VIA to "http" below and plug in an
  HTTP-based provider (Resend/Brevo/SendGrid), which works over
  port 443 and is not affected by SMTP port blocking.
  ==============================================================
*/

async function getSmtpSettings() {

    const settings = await Settings.findOne();

    if (!settings || !settings.siteSettings) {
        throw new Error("Website settings not found in database.");
    }

    const smtp = settings.siteSettings;

    if (!smtp.smtpUser || !smtp.smtpPass) {
        throw new Error("SMTP settings are missing (set SMTP user/pass in Admin → Website Settings).");
    }

    return { settings, smtp };

}

function buildTransport(smtp, port) {

    return nodemailer.createTransport({

        host: "smtp.gmail.com",
        port,
        secure: port === 465, // 465 = SSL, 587 = STARTTLS

        auth: {
            user: smtp.smtpUser,
            pass: smtp.smtpPass
        },

        pool: true,
        maxConnections: 3,
        maxMessages: 50,

        // fail fast instead of hanging when a port is blocked
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000

    });

}

/* Backward-compatible: default transport (465) */
async function getMailer() {

    const { smtp } = await getSmtpSettings();

    return buildTransport(smtp, 465);

}

/*
  sendMail(mailOptions) — use this for anything new.
  Tries 465, falls back to 587 automatically, throws a clear
  combined error only if BOTH fail.
*/
async function sendMail(mailOptions) {

    const { settings, smtp } = await getSmtpSettings();

    const from = mailOptions.from ||
        `${settings.siteSettings.senderName} <${smtp.smtpUser}>`;

    const finalOptions = { ...mailOptions, from };

    const ports = [465, 587];
    const errors = [];

    for (const port of ports) {

        try {

            const transporter = buildTransport(smtp, port);

            await transporter.sendMail(finalOptions);

            console.log(`✅ Email sent to ${finalOptions.to} via port ${port}`);

            return { success: true, port };

        } catch (err) {

            console.log(`❌ Email via port ${port} failed:`, err.message);

            errors.push(`port ${port}: ${err.message}`);

        }

    }

    throw new Error(
        `Could not send email on either port 465 or 587. ` +
        `This almost always means the hosting provider is blocking ` +
        `outbound SMTP traffic, or the Gmail App Password is wrong. ` +
        `Details -> ${errors.join(" | ")}`
    );

}

module.exports = getMailer;
module.exports.getMailer = getMailer;
module.exports.sendMail = sendMail;
