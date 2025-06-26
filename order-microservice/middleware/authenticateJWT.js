const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.uuid) {
      return res.status(403).json({ error: "Invalid token: uuid missing" });
    }

    req.user = { uuid: decoded.uuid }; // We only capture uuid
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
