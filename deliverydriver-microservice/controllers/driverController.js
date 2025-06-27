// controllers/driverController.js - Complete Driver Controller Implementation

const authService = require('../services/authService');
const orderService = require('../services/orderService');
const restaurantService = require('../services/restaurantService');
const DriverProfile = require('../models/DriverProfile'); // You'll need to create this model

class DriverController {
  
  // ================================================================
  // DRIVER ONBOARDING & PROFILE MANAGEMENT
  // ================================================================

  /**
   * Complete driver onboarding process
   * POST /api/drivers/onboard
   */
  static async onboardDriver(req, res) {
    try {
      const {
        phone_number,
        license_number,
        vehicle_type,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_color,
        license_plate,
        insurance_number,
        emergency_contact_name,
        emergency_contact_phone,
        bank_account_iban,
        tax_id
      } = req.body;

      const driverId = req.driver.driverId;
      const userToken = req.header('Authorization')?.replace('Bearer ', '');

      // Validation
      const validationErrors = [];

      // Required fields validation
      if (!phone_number) validationErrors.push('Phone number is required');
      if (!license_number) validationErrors.push('License number is required');
      if (!vehicle_type) validationErrors.push('Vehicle type is required');
      if (!license_plate) validationErrors.push('License plate is required');
      if (!emergency_contact_name) validationErrors.push('Emergency contact name is required');
      if (!emergency_contact_phone) validationErrors.push('Emergency contact phone is required');

      // Vehicle type validation
      const validVehicleTypes = ['bike', 'scooter', 'car', 'truck'];
      if (vehicle_type && !validVehicleTypes.includes(vehicle_type)) {
        validationErrors.push('Invalid vehicle type');
      }

      // Motorized vehicle validation
      if (vehicle_type && vehicle_type !== 'bike') {
        if (!vehicle_make) validationErrors.push('Vehicle make is required for motorized vehicles');
        if (!vehicle_model) validationErrors.push('Vehicle model is required for motorized vehicles');
        if (!vehicle_year) validationErrors.push('Vehicle year is required for motorized vehicles');
        if (!insurance_number) validationErrors.push('Insurance number is required for motorized vehicles');
        
        // Year validation
        const currentYear = new Date().getFullYear();
        if (vehicle_year && (vehicle_year < 1990 || vehicle_year > currentYear + 1)) {
          validationErrors.push('Invalid vehicle year');
        }
      }

      // Phone number validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (phone_number && !phoneRegex.test(phone_number)) {
        validationErrors.push('Invalid phone number format');
      }
      if (emergency_contact_phone && !phoneRegex.test(emergency_contact_phone)) {
        validationErrors.push('Invalid emergency contact phone format');
      }

      // IBAN validation (if provided)
      if (bank_account_iban) {
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
        const cleanIban = bank_account_iban.replace(/\s/g, '');
        if (!ibanRegex.test(cleanIban)) {
          validationErrors.push('Invalid IBAN format');
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Check if driver profile already exists
      const existingDriver = await DriverProfile.findOne({ driverId });
      if (existingDriver) {
        return res.status(409).json({
          success: false,
          error: 'Driver profile already exists. You can update your profile instead.',
          data: {
            driverId: existingDriver.driverId,
            status: existingDriver.status,
            canUpdate: true
          }
        });
      }

      // Create driver profile
      const driverProfile = new DriverProfile({
        driverId,
        phone_number: phone_number.trim(),
        license_number: license_number.trim(),
        vehicle_type,
        vehicle_make: vehicle_make?.trim() || null,
        vehicle_model: vehicle_model?.trim() || null,
        vehicle_year: vehicle_year || null,
        vehicle_color: vehicle_color?.trim() || null,
        license_plate: license_plate.trim().toUpperCase(),
        insurance_number: insurance_number?.trim() || null,
        emergency_contact: {
          name: emergency_contact_name.trim(),
          phone: emergency_contact_phone.trim()
        },
        bank_account_iban: bank_account_iban?.replace(/\s/g, '') || null,
        tax_id: tax_id?.trim() || null,
        status: 'pending_verification',
        is_verified: false,
        is_available: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      await driverProfile.save();

      // Update user service with driver status
      try {
        await authService.updateDriverStatus(userToken, {
          hasDriverProfile: true,
          driverStatus: 'pending_verification',
          vehicleType: vehicle_type,
          licenseNumber: license_number
        });
      } catch (authError) {
        console.warn('Failed to update auth service:', authError.message);
        // Don't fail the request if auth service update fails
      }

      // Log the onboarding event
      console.log(`Driver onboarding completed for user ${driverId}:`, {
        vehicleType: vehicle_type,
        licenseNumber: license_number,
        emergencyContact: emergency_contact_name
      });

      res.status(201).json({
        success: true,
        message: 'Driver onboarding completed successfully! We will review your application and get back to you within 24-48 hours.',
        data: {
          driverId: driverProfile.driverId,
          status: driverProfile.status,
          verificationRequired: true,
          estimatedApprovalTime: '24-48 hours',
          nextSteps: [
            'Document verification',
            'Background check',
            'Account activation'
          ],
          contact: {
            support: 'drivers@company.com',
            phone: '+33123456789'
          }
        }
      });

    } catch (error) {
      console.error('Driver onboarding error:', error);

      // Handle specific database errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          success: false,
          error: `${field} already exists`,
          details: [`A driver with this ${field} is already registered`]
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to complete driver onboarding',
        details: ['Please try again later or contact support if the issue persists']
      });
    }
  }

  /**
   * Get driver profile
   * GET /api/drivers/profile
   */
  static async getDriverProfile(req, res) {
    try {
      const driverId = req.driver.driverId;

      // Try to get driver profile from local database
      let driverProfile = await DriverProfile.findOne({ driverId });

      // If no local profile, create a basic one from auth service data
      if (!driverProfile) {
        driverProfile = {
          driverId: req.driver.driverId,
          email: req.driver.email,
          firstName: req.driver.firstName,
          lastName: req.driver.lastName,
          phoneNumber: req.driver.phoneNumber,
          vehicleType: req.driver.vehicleType,
          licenseNumber: req.driver.licenseNumber,
          isAvailable: req.driver.isAvailable,
          currentLocation: req.driver.currentLocation,
          status: 'incomplete',
          needsOnboarding: true
        };
      }

      res.json({
        success: true,
        data: {
          driver: driverProfile,
          user: req.user
        }
      });

    } catch (error) {
      console.error('Error fetching driver profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch driver profile'
      });
    }
  }

  /**
   * Update driver profile
   * PUT /api/drivers/profile
   */
  static async updateDriverProfile(req, res) {
    try {
      const driverId = req.driver.driverId;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.driverId;
      delete updateData.status;
      delete updateData.is_verified;
      delete updateData.created_at;

      updateData.updated_at = new Date();

      const updatedProfile = await DriverProfile.findOneAndUpdate(
        { driverId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          error: 'Driver profile not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { driver: updatedProfile }
      });

    } catch (error) {
      console.error('Error updating driver profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update driver profile'
      });
    }
  }

  // ================================================================
  // LOCATION & AVAILABILITY MANAGEMENT
  // ================================================================

  /**
   * Update driver location
   * POST /api/drivers/location
   */
  static async updateLocation(req, res) {
    try {
      const { latitude, longitude, heading, speed, isAvailable } = req.body;
      const driverId = req.driver.driverId;
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }

      // Update location in auth service
      const result = await authService.updateDriverLocation(
        token, 
        latitude, 
        longitude, 
        isAvailable
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Update local driver profile if exists
      try {
        await DriverProfile.findOneAndUpdate(
          { driverId },
          {
            'current_location.latitude': latitude,
            'current_location.longitude': longitude,
            'current_location.last_updated': new Date(),
            is_available: isAvailable !== undefined ? isAvailable : undefined,
            updated_at: new Date()
          },
          { new: true }
        );
      } catch (dbError) {
        console.warn('Failed to update local driver profile:', dbError.message);
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: { 
          driverId,
          latitude,
          longitude,
          heading,
          speed,
          isAvailable,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update location'
      });
    }
  }

  /**
   * Toggle driver availability
   * POST /api/drivers/availability
   */
  static async toggleAvailability(req, res) {
    try {
      const { isAvailable } = req.body;
      const driverId = req.driver.driverId;
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isAvailable must be a boolean value'
        });
      }

      // Update availability in auth service
      const result = await authService.updateDriverAvailability(token, isAvailable);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Update local driver profile if exists
      try {
        await DriverProfile.findOneAndUpdate(
          { driverId },
          {
            is_available: isAvailable,
            updated_at: new Date()
          },
          { new: true }
        );
      } catch (dbError) {
        console.warn('Failed to update local driver profile:', dbError.message);
      }

      res.json({
        success: true,
        message: `Driver is now ${isAvailable ? 'available' : 'unavailable'}`,
        data: { 
          driverId,
          isAvailable,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update availability'
      });
    }
  }

  // ================================================================
  // DELIVERY OPERATIONS
  // ================================================================

  /**
   * Get available deliveries for driver
   * GET /api/deliveries/available (handled in orderRoutes)
   */
  static async getAvailableDeliveries(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const driverId = req.driver.driverId;
      
      // Check if driver is available
      if (!req.driver.isAvailable) {
        return res.status(403).json({
          success: false,
          error: 'You must be available to view orders. Please update your availability status.'
        });
      }
      
      const result = await orderService.getAvailableOrders({
        page: parseInt(page),
        limit: parseInt(limit)
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      // Enhance orders with restaurant details
      const restaurantIds = [...new Set(result.orders.map(order => order.restaurantId).filter(Boolean))];
      let enhancedOrders = result.orders;
      
      if (restaurantIds.length > 0) {
        const restaurantsResult = await restaurantService.getRestaurantsDetails(restaurantIds);
        
        if (restaurantsResult.success) {
          const restaurantMap = new Map(
            restaurantsResult.restaurants.map(r => [r.restaurantId, r])
          );
          
          enhancedOrders = result.orders.map(order => ({
            ...order,
            restaurant: restaurantMap.get(order.restaurantId) || null
          }));
        }
      }

      res.json({
        success: true,
        data: {
          orders: enhancedOrders,
          pagination: result.pagination
        }
      });

    } catch (error) {
      console.error('Error fetching available deliveries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available deliveries'
      });
    }
  }

  /**
   * Get driver's current delivery
   * GET /api/drivers/deliveries/current
   */
  static async getCurrentDelivery(req, res) {
    try {
      const driverId = req.driver.driverId;
      
      // This would typically query your local database for current assignments
      // For now, return a placeholder since we're using the order service
      res.json({
        success: true,
        data: null // No current delivery
      });

    } catch (error) {
      console.error('Error fetching current delivery:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch current delivery'
      });
    }
  }

  /**
   * Get driver's delivery history
   * GET /api/drivers/deliveries/history
   */
  static async getDriverDeliveries(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const driverId = req.driver.driverId;
      
      const result = await orderService.getDriverOrders(driverId, status);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          deliveries: result.orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.orders.length,
            pages: Math.ceil(result.orders.length / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Error fetching driver deliveries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch delivery history'
      });
    }
  }

  // ================================================================
  // DRIVER STATISTICS & EARNINGS
  // ================================================================

  /**
   * Get driver statistics
   * GET /api/drivers/stats
   */
  static async getDriverStats(req, res) {
    try {
      const { timeframe = 'week' } = req.query;
      const driverId = req.driver.driverId;

      // Get driver profile for basic stats
      const driverProfile = await DriverProfile.findOne({ driverId });
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get stats from driver profile or calculate from order history
      const stats = {
        totalDeliveries: driverProfile?.stats?.total_deliveries || 0,
        completedDeliveries: driverProfile?.stats?.completed_deliveries || 0,
        totalEarnings: driverProfile?.stats?.total_earnings || 0,
        averageRating: driverProfile?.stats?.average_rating || 0,
        totalHours: 0, // Calculate from activity logs
        completionRate: driverProfile?.stats?.completed_deliveries > 0 
          ? ((driverProfile.stats.completed_deliveries / driverProfile.stats.total_deliveries) * 100).toFixed(1)
          : 0
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching driver stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch driver statistics'
      });
    }
  }

  /**
   * Get driver earnings
   * GET /api/drivers/earnings
   */
  static async getDriverEarnings(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const driverId = req.driver.driverId;

      // For now, return basic earnings data
      // In a real implementation, you'd query delivery history and calculate earnings
      const earnings = {
        totalEarnings: 0,
        baseEarnings: 0,
        tips: 0,
        bonuses: 0,
        deductions: 0,
        netEarnings: 0,
        earningsBreakdown: []
      };

      res.json({
        success: true,
        data: earnings
      });

    } catch (error) {
      console.error('Error fetching driver earnings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch driver earnings'
      });
    }
  }

  // ================================================================
  // VEHICLE MANAGEMENT
  // ================================================================

  /**
   * Get vehicle information
   * GET /api/drivers/vehicle
   */
  static async getVehicleInfo(req, res) {
    try {
      const driverId = req.driver.driverId;
      
      const driverProfile = await DriverProfile.findOne({ driverId });
      
      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          error: 'Driver profile not found'
        });
      }

      const vehicleInfo = {
        type: driverProfile.vehicle_type,
        make: driverProfile.vehicle_make,
        model: driverProfile.vehicle_model,
        year: driverProfile.vehicle_year,
        color: driverProfile.vehicle_color,
        licensePlate: driverProfile.license_plate,
        insuranceNumber: driverProfile.insurance_number,
        documents: driverProfile.documents
      };

      res.json({
        success: true,
        data: vehicleInfo
      });

    } catch (error) {
      console.error('Error fetching vehicle info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vehicle information'
      });
    }
  }

  // ================================================================
  // ADMIN OPERATIONS
  // ================================================================

  /**
   * Get all drivers (admin only)
   * GET /api/drivers/admin/all
   */
  static async getAllDrivers(req, res) {
    try {
      const { page = 1, limit = 20, status, verified } = req.query;
      
      const query = {};
      if (status) query.status = status;
      if (verified !== undefined) query.is_verified = verified === 'true';

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [drivers, total] = await Promise.all([
        DriverProfile.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        DriverProfile.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          drivers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Error fetching all drivers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch drivers'
      });
    }
  }

  /**
   * Get verification status
   * GET /api/drivers/verification-status
   */
  static async getVerificationStatus(req, res) {
    try {
      const driverId = req.driver.driverId;
      
      const driverProfile = await DriverProfile.findOne({ driverId });
      
      if (!driverProfile) {
        return res.status(404).json({
          success: false,
          error: 'Driver profile not found'
        });
      }

      const verificationStatus = {
        isVerified: driverProfile.is_verified,
        status: driverProfile.status,
        documentsStatus: {
          // Check which documents are uploaded
          profilePhoto: !!driverProfile.documents?.profile_photo,
          driverLicense: !!driverProfile.documents?.driver_license_front,
          vehicleRegistration: !!driverProfile.documents?.vehicle_registration,
          insurance: !!driverProfile.documents?.insurance_certificate
        },
        verificationNotes: driverProfile.verification_notes,
        lastUpdated: driverProfile.updated_at
      };

      res.json({
        success: true,
        data: verificationStatus
      });

    } catch (error) {
      console.error('Error fetching verification status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch verification status'
      });
    }
  }
}

module.exports = DriverController;