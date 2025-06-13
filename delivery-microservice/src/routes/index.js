const express = require("express");
const OrderController = require("../controllers/orderController");
const auth = require("../middleware/auth");
const router = express.Router();


// TODO: Implement delivery routes
const deliveryRoutes = require("./deliveryRoutes");

const driverRoutes = require("./driverRoutes");
const trackingRoutes = require("./trackingRoutes");
const app = express();

// Middleware to handle errors
const errorHandler = require("../middleware/errorHandler");
app.use(errorHandler);

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});
    
// Delivery routes
router.use("/deliveries", deliveryRoutes);
// Driver routes
router.use("/drivers", driverRoutes);
router.use("/tracking", trackingRoutes);


module.exports = router;
