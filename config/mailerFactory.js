const nodemailer = require("nodemailer");
const Settings = require("../models/Settings");

async function getMailer() {

    const settings = await Settings.findOne();

    if (!settings || !settings.siteSettings) {
        throw new Error("Website settings not found");
    }

    const smtp = settings.siteSettings;

    if (!smtp.smtpUser || !smtp.smtpPass) {
        throw new Error("SMTP settings are missing.");
    }

    return nodemailer.createTransport({

        service: "gmail",

        auth: {

            user: smtp.smtpUser,

            pass: smtp.smtpPass

        }

    });

}

module.exports = getMailer;