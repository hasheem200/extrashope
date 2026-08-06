const mailerFactory = require("../config/mailerFactory");
const Settings = require("../models/Settings");
const User = require("../models/User");

/*
  ==============================================================
  Sends a professional-looking copy of an in-app notification to
  a specific USER's own configured notification email (set from
  their side — Seller Panel -> Connect Email).

  Same "fire and forget" design as notifyAdmin: never throws, and
  never blocks whatever real action triggered it (a withdraw
  request still succeeds even if this email fails).
  ==============================================================
*/

const TYPE_STYLES = {

    info: { color: "#2196f3", label: "ℹ️ Info" },
    success: { color: "#00c853", label: "✅ Success" },
    warning: { color: "#ff9800", label: "⚠️ Action Needed" },
    danger: { color: "#e53935", label: "🚨 Alert" }

};

async function notifyUserByEmail(nickname, { type = "info", title, message, details = {}, actionUrl, actionLabel }) {

    try {

        const user = await User.findOne({ nickname }).select("email nickname");

        // Every buyer/seller already has their registration email —
        // notifications go there automatically, nothing for them to
        // set up or connect separately.
        const notificationEmail = user?.email;

        if (!notificationEmail || notificationEmail.trim() === "") {
            // no account email on file (shouldn't normally happen
            // since email is required at registration) — nothing to
            // send to.
            return;
        }

        const settings = await Settings.findOne();

        const siteName = settings?.siteSettings?.siteName || "ExtraShope";
        const siteUrl = settings?.siteSettings?.siteUrl || "";
        const style = TYPE_STYLES[type] || TYPE_STYLES.info;

        const detailRows = Object.entries(details)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([key, value]) => `
                <tr>
                    <td style="padding:8px 12px;color:#666;font-size:14px;border-bottom:1px solid #eee;white-space:nowrap;">${key}</td>
                    <td style="padding:8px 12px;color:#111;font-size:14px;border-bottom:1px solid #eee;font-weight:600;">${value}</td>
                </tr>
            `).join("");

        const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#f5f5f5;padding:24px;">

  <div style="background:#111;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
    <div style="font-size:18px;font-weight:bold;">${siteName}</div>
    <div style="font-size:13px;color:#aaa;margin-top:2px;">Notification for ${nickname}</div>
  </div>

  <div style="background:white;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06);">

    <div style="display:inline-block;background:${style.color}1a;color:${style.color};font-size:12px;font-weight:bold;padding:4px 10px;border-radius:20px;margin-bottom:12px;">
      ${style.label}
    </div>

    <h2 style="margin:0 0 10px;color:#111;font-size:20px;">${title}</h2>

    <p style="color:#444;font-size:15px;line-height:1.5;margin:0 0 18px;">${message}</p>

    ${detailRows ? `
    <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      ${detailRows}
    </table>
    ` : ""}

    ${actionUrl ? `
    <a href="${actionUrl}" style="display:inline-block;background:${style.color};color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
      ${actionLabel || "View in Dashboard"}
    </a>
    ` : ""}

    <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:14px;">
      Sent automatically by ${siteName}${siteUrl ? ` — <a href="${siteUrl}" style="color:#999;">${siteUrl.replace(/^https?:\/\//, "")}</a>` : ""} at ${new Date().toLocaleString()}.
      You're receiving this at your registered account email.
    </p>

  </div>

</div>`;

        await mailerFactory.sendMail({

            to: notificationEmail,

            subject: `${style.label.replace(/^[^\s]+\s/, "")}: ${title} — ${siteName}`,

            html

        });

        console.log(`✅ User notification email sent to ${nickname}: "${title}" -> ${notificationEmail}`);

    } catch (err) {

        // Never let a notification-email failure break the real
        // action that triggered it.
        console.log(`⚠️  User notification email failed for ${nickname} ("${title}"):`, err.message);

    }

}

module.exports = notifyUserByEmail;
