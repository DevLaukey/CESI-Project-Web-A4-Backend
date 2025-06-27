const express = require("express");
const authService = require("../services/authService");
const authMiddleware = require("../middleware/authMiddleware");
const DriverController = require("../controllers/driverController");

const router = express.Router();


/**
 * @swagger
 * /api/drivers/onboard:
 *   post:
 *     summary: Complete driver onboarding process
 *     tags: [Driver - Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - license_number
 *               - vehicle_type
 *               - license_plate
 *               - emergency_contact_name
 *               - emergency_contact_phone
 *             properties:
 *               phone_number:
 *                 type: string
 *                 description: Driver's phone number
 *                 example: "+33123456789"
 *               license_number:
 *                 type: string
 *                 description: Driver's license number
 *                 example: "DL123456789"
 *               vehicle_type:
 *                 type: string
 *                 enum: [bike, scooter, car, truck]
 *                 description: Type of vehicle
 *               vehicle_make:
 *                 type: string
 *                 description: Vehicle make (required for motorized vehicles)
 *                 example: "Toyota"
 *               vehicle_model:
 *                 type: string
 *                 description: Vehicle model (required for motorized vehicles)
 *                 example: "Camry"
 *               vehicle_year:
 *                 type: integer
 *                 description: Vehicle year (required for motorized vehicles)
 *                 example: 2020
 *               vehicle_color:
 *                 type: string
 *                 description: Vehicle color
 *                 example: "Blue"
 *               license_plate:
 *                 type: string
 *                 description: Vehicle license plate
 *                 example: "AB-123-CD"
 *               insurance_number:
 *                 type: string
 *                 description: Insurance number (required for motorized vehicles)
 *                 example: "INS123456789"
 *               emergency_contact_name:
 *                 type: string
 *                 description: Emergency contact name
 *                 example: "John Doe"
 *               emergency_contact_phone:
 *                 type: string
 *                 description: Emergency contact phone
 *                 example: "+33123456789"
 *               bank_account_iban:
 *                 type: string
 *                 description: Bank account IBAN for payments
 *                 example: "FR1420041010050500013M02606"
 *               tax_id:
 *                 type: string
 *                 description: Tax ID for reporting
 *                 example: "TAX123456789"
 *     responses:
 *       201:
 *         description: Driver onboarding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending_verification, verified, suspended, rejected]
 *                     verificationRequired:
 *                       type: boolean
 *                     estimatedApprovalTime:
 *                       type: string
 *       400:
 *         description: Validation error or missing required fields
 *       409:
 *         description: Driver profile already exists
 *       401:
 *         description: Unauthorized or invalid token
 */
router.post(
  '/onboard',
  authMiddleware,
  DriverController.onboardDriver
);

// Get driver profile (from auth service)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        driver: req.driver,
        user: req.user,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
});

// Update driver location and availability
router.post("/location", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, isAvailable } = req.body;
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required",
      });
    }

    const result = await authService.updateDriverLocation(
      token,
      latitude,
      longitude,
      isAvailable
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        driverId: req.driver.driverId,
        latitude,
        longitude,
        isAvailable,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update location",
    });
  }
});

// Update driver availability
router.post("/availability", authMiddleware, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isAvailable must be a boolean value",
      });
    }

    const result = await authService.updateDriverAvailability(
      token,
      isAvailable
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: `Driver is now ${isAvailable ? "available" : "unavailable"}`,
      data: {
        driverId: req.driver.driverId,
        isAvailable,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update availability",
    });
  }
});

module.exports = router;
