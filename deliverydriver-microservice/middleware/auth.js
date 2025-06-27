const jwt = require("jsonwebtoken");
const Driver = require("../models/Driver");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const driver = await Driver.findOne({
      driverId: decoded.driverId,
      isActive: true,
    });

    if (!driver) {
      return res
        .status(401)
        .json({ error: "Invalid token or driver not found." });
    }

    req.driver = driver;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

module.exports = authMiddleware;
