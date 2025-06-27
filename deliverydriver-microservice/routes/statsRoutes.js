const express = require("express");
const Order = require("../models/Order");
const Driver = require("../models/Driver");

const router = express.Router();

// Get driver statistics
router.get("/dashboard", async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    // Get basic stats from driver document
    const driver = await Driver.findOne({ driverId });

    // Calculate additional stats from orders
    const [
      completedOrders,
      todayDeliveries,
      weekDeliveries,
      monthDeliveries,
      activeDeliveries,
      avgDeliveryTime,
    ] = await Promise.all([
      // Total completed deliveries
      Order.countDocuments({
        driverId,
        status: "delivered",
      }),

      // Today's deliveries
      Order.countDocuments({
        driverId,
        status: "delivered",
        deliveredAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),

      // This week's deliveries
      Order.countDocuments({
        driverId,
        status: "delivered",
        deliveredAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),

      // This month's deliveries
      Order.countDocuments({
        driverId,
        status: "delivered",
        deliveredAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),

      // Current active deliveries
      Order.countDocuments({
        driverId,
        status: "out_for_delivery",
      }),

      // Average delivery time calculation
      Order.aggregate([
        {
          $match: {
            driverId,
            status: "delivered",
            deliveryAcceptedAt: { $exists: true },
            deliveredAt: { $exists: true },
          },
        },
        {
          $project: {
            deliveryTime: {
              $divide: [
                { $subtract: ["$deliveredAt", "$deliveryAcceptedAt"] },
                1000 * 60, // Convert to minutes
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: "$deliveryTime" },
          },
        },
      ]),
    ]);

    // Today's earnings
    const todayEarnings = await Order.aggregate([
      {
        $match: {
          driverId,
          status: "delivered",
          deliveredAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$deliveryFee" },
        },
      },
    ]);

    // Week's earnings
    const weekEarnings = await Order.aggregate([
      {
        $match: {
          driverId,
          status: "delivered",
          deliveredAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$deliveryFee" },
        },
      },
    ]);

    // Performance metrics
    const totalOrdersAccepted = await Order.countDocuments({
      driverId,
      $or: [{ status: "delivered" }, { status: "out_for_delivery" }],
    });

    const completionRate =
      totalOrdersAccepted > 0
        ? ((completedOrders / totalOrdersAccepted) * 100).toFixed(1)
        : 100;

    const stats = {
      totalDeliveries: driver.totalDeliveries || completedOrders,
      totalEarnings: driver.totalEarnings || 0,
      todayDeliveries,
      weekDeliveries,
      monthDeliveries,
      activeDeliveries,
      todayEarnings: todayEarnings[0]?.total || 0,
      weekEarnings: weekEarnings[0]?.total || 0,
      avgDeliveryTime: avgDeliveryTime[0]?.avgTime
        ? Math.round(avgDeliveryTime[0].avgTime)
        : null,
      completionRate: parseFloat(completionRate),
      rating: driver.rating || 5.0,
      isOnline: driver.isOnline || false,
      lastActiveAt: driver.lastActiveAt,
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch driver statistics",
      details: error.message,
    });
  }
});

// Get earnings breakdown
router.get("/earnings", async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const driverId = req.driver.driverId;

    let startDate;
    let groupBy;

    switch (period) {
      case "day":
        startDate = new Date(new Date().setHours(0, 0, 0, 0));
        groupBy = { $hour: "$deliveredAt" };
        break;
      case "week":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfWeek: "$deliveredAt" };
        break;
      case "month":
        startDate = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        groupBy = { $dayOfMonth: "$deliveredAt" };
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = { $dayOfWeek: "$deliveredAt" };
    }

    const earnings = await Order.aggregate([
      {
        $match: {
          driverId,
          status: "delivered",
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupBy,
          totalEarnings: { $sum: "$deliveryFee" },
          deliveryCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        period,
        earnings,
        total: earnings.reduce((sum, item) => sum + item.totalEarnings, 0),
        totalDeliveries: earnings.reduce(
          (sum, item) => sum + item.deliveryCount,
          0
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch earnings data",
      details: error.message,
    });
  }
});

module.exports = router;
