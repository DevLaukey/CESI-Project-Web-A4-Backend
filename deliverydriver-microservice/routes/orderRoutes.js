const express = require("express");
const orderService = require("../services/orderService");
const restaurantService = require("../services/restaurantService");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.get("/available", authMiddleware, async (req, res) => {
  try {
    console.log("here")
    console.log("Fetching available orders for driver:", req.driver.driverId);
    const { page = 1, limit = 20 } = req.query;

    console.log("Driver details:", req.driver);

    
    if (!req.driver.isAvailable) {
      return res.status(403).json({
        success: false,
        error:
          "You must be available to view orders. Please update your availability status.",
      });
    }

    const result = await orderService.getAvailableOrders({
      page: parseInt(page),
      limit: parseInt(limit),
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    
    const restaurantIds = [
      ...new Set(
        result.orders.map((order) => order.restaurantId).filter(Boolean)
      ),
    ];
    let enhancedOrders = result.orders;

    if (restaurantIds.length > 0) {
      const restaurantsResult = await restaurantService.getRestaurantsDetails(
        restaurantIds
      );

      if (restaurantsResult.success) {
        const restaurantMap = new Map(
          restaurantsResult.restaurants.map((r) => [r.restaurantId, r])
        );

        enhancedOrders = result.orders.map((order) => ({
          ...order,
          restaurant: restaurantMap.get(order.restaurantId) || null,
        }));
      }
    }

    res.json({
      success: true,
      data: {
        orders: enhancedOrders,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error("Error fetching available orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch available orders",
    });
  }
});


router.post("/:orderId/accept", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.driver.driverId;
    const token = req.header("Authorization")?.replace("Bearer ", "");  


    console.log("Accepting order:", orderId, "for driver:", driverId);

    
    if (!req.driver.isAvailable) {
      return res.status(403).json({
        success: false,
        error: "You must be available to accept orders",
      });
    }

    const result = await orderService.acceptOrder(token, orderId, driverId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: "Order accepted successfully",
      data: {
        order: result.order,
        nextStep: "Head to the restaurant to pick up the order",
      },
    });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to accept order",
    });
  }
});


router.post("/:orderId/pickup", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.driver.driverId;
    const { notes, location } = req.body;
    const token = req.header("Authorization")?.replace("Bearer ", "");
    console.log("Marking order as picked up:", orderId, "by driver:", driverId);

    
    const orderResult = await orderService.getOrderDetails(token, orderId);
    console.log("Order details:", orderResult);
    if (!orderResult.success) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const order = orderResult.order;

    
    const updateResult = await orderService.updateOrderStatus(
      token,
      orderId,
      "picked_up", 
      driverId,
      {
        pickedUpAt: new Date().toISOString(),
        pickupNotes: notes,
        pickupLocation: location,
      }
    );

    if (!updateResult.success) {
      return res.status(400).json({
        success: false,
        error: updateResult.error,
      });
    }

    
    if (order.restaurant_id) {
      await restaurantService.notifyPickup(
        order.restaurant_id,
        orderId,
        driverId
      );
    }

    res.json({
      success: true,
      message: "Order marked as picked up",
      data: {
        order: updateResult.order,
        nextStep: "Deliver the order to the customer",
      },
    });
  } catch (error) {
    console.error("Error marking pickup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark order as picked up",
    });
  }
});


router.post("/:orderId/complete", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.driver.driverId;
    const { deliveryNotes, customerSignature, deliveryLocation } = req.body;
    const token = req.header("Authorization")?.replace("Bearer ", "");

    
    const result = await orderService.updateOrderStatus(
      token,
      orderId,
      "delivered",
      driverId,
      {
        deliveredAt: new Date().toISOString(),
        deliveryNotes,
        customerSignature,
        deliveryLocation,
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    
    const earnings = orderService.calculateDeliveryFee(result.order);

    res.json({
      success: true,
      message: "Delivery completed successfully!",
      data: {
        order: result.order,
        earnings: earnings,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error completing delivery:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete delivery",
    });
  }
});


router.post("/:orderId/reject", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.driver.driverId;
    const { reason } = req.body;
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "Rejection reason is required",
      });
    }

    
    const result = await orderService.updateOrderStatus(
      token,
      orderId,
      "confirmed",
      null, 
      {
        rejectedAt: new Date().toISOString(),
        rejectedBy: driverId,
        rejectionReason: reason,
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: "Order rejected successfully",
      data: { order: result.order },
    });
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reject order",
    });
  }
});


router.get("/my-orders", authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const driverId = req.driver.driverId;

    const result = await orderService.getDriverOrders(driverId, status);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: { orders: result.orders },
    });
  } catch (error) {
    console.error("Error fetching driver orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch your orders",
    });
  }
});

module.exports = router;
