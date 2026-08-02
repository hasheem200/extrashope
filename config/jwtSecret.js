const crypto = require("crypto");
const Settings = require("../models/Settings");

/*
  ==============================================================
  Old code signed every login token with a hardcoded string:
  jwt.sign({...}, "SECRETKEY", ...)

  That's a critical vulnerability — anyone who reads the source
  code (or guesses it, since it's a common default) can forge a
  valid token for ANY user, including role:"admin", without ever
  knowing a password.

  Fix: generate a long random secret once and store it in the
  database (Settings collection), so it's unique per-deployment,
  never hardcoded/committed to git, and persists across restarts
  and redeploys automatically — no manual .env setup required.
  ==============================================================
*/

let cachedSecret = null;

async function getJwtSecret() {

    if (cachedSecret) {
        return cachedSecret;
    }

    let settings = await Settings.findOne();

    if (!settings) {
        settings = await Settings.create({});
    }

    if (!settings.jwtSecret) {

        settings.jwtSecret = crypto.randomBytes(48).toString("hex");

        await settings.save();

        console.log("🔑 Generated a new JWT signing secret and saved it to the database.");

    }

    cachedSecret = settings.jwtSecret;

    return cachedSecret;

}

module.exports = getJwtSecret;
