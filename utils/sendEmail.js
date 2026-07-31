const getMailer = require("../config/mailerFactory");
const Settings = require("../models/Settings");

/*
  This used to be a stub that only logged to the console and
  never actually sent anything ("EMAIL DISABLED"), which made it
  look like verification/notification emails were being sent when
  they never were. Now it actually sends through the configured
  Gmail SMTP (config/mailerFactory.js), with fail-fast timeouts so
  a blocked SMTP port on a host errors out quickly instead of
  hanging, and clear logging so failures are visible.
*/

module.exports = async function (to, subject, message) {

  try {

    const settings = await Settings.findOne();

    if (!settings || !settings.siteSettings ||
        !settings.siteSettings.smtpUser || !settings.siteSettings.smtpPass) {

      console.log("❌ sendEmail: SMTP not configured in Website Settings, skipping send to", to);
      return false;

    }

    const mailer = await getMailer();

    await mailer.sendMail({

      from: `${settings.siteSettings.senderName} <${settings.siteSettings.smtpUser}>`,

      to,

      subject,

      html: message

    });

    console.log(`✅ Email sent to ${to}: ${subject}`);

    return true;

  } catch (err) {

    console.log(`❌ Email to ${to} failed:`, err.message);
    return false;

  }

};
