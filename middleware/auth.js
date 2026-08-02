const jwt = require("jsonwebtoken");
const getJwtSecret = require("../config/jwtSecret");

/*
  ==============================================================
  Central auth middleware. Nothing in this project checked who
  was calling an API before — this is what actually enforces it.
  ==============================================================
*/

/* Requires a valid token. Rejects the request if missing/invalid. */
async function verifyToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Login required." });
    }

    const token = authHeader.split(" ")[1];

    try {

        const secret = await getJwtSecret();

        const decoded = jwt.verify(token, secret);

        req.user = decoded; // { id, nickname, role }

        next();

    } catch (err) {

        return res.status(401).json({ message: "Session expired, please log in again." });

    }

}

/* Attaches req.user if a valid token is present, but never blocks the request. */
async function optionalAuth(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(" ")[1];

    try {

        const secret = await getJwtSecret();

        req.user = jwt.verify(token, secret);

    } catch (err) {

        req.user = null;

    }

    next();

}

/* Must be used AFTER verifyToken. Restricts to specific roles. */
function requireRole(...roles) {

    return (req, res, next) => {

        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "You don't have permission to do that." });
        }

        next();

    };

}

/* Must be used AFTER verifyToken. Allows the resource owner OR an admin. */
function requireSelfOrAdmin(getOwnerNickname) {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ message: "Login required." });
        }

        const ownerNickname = getOwnerNickname(req);

        if (req.user.role === "admin" || req.user.nickname === ownerNickname) {
            return next();
        }

        return res.status(403).json({ message: "You don't have permission to do that." });

    };

}

module.exports = { verifyToken, optionalAuth, requireRole, requireSelfOrAdmin };
