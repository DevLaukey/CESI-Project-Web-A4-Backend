const Driver = require("../models/Driver");
const Delivery = require("../models/Delivery");
const { sequelize, execute } = require("../config/database");
const logger = require("../utils/logger");
const {
  validateDriverRegistration,
  validateDriverUpdate,
  validateDriverDocuments,
} = require("../validators/driverValidator");
const externalServices = require("../services/externalServices");

class DriverController {
  // Register as driver
  static async registerDriver(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { error, value } = validateDriverRegistration(req.body);
      if (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      // Check if user is already a driver
      const existingDriver = await Driver.findByUserId(req.user.id);
      if (existingDriver) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: "User is already registered as a driver",
        });
      }

      const driverData = {
        ...value,
        user_id: req.user.id,
      };

      // Handle referral code
      if (value.referral_code) {
        const referrer = await Driver.findByReferralCode(value.referral_code);
        if (referrer) {
          driverData.referred_by = referrer.id;

          // Process referral bonus
          await externalServices.processReferral({
            referrer_id: referrer.id,
            referee_id: req.user.id,
            type: "driver_referral",
          });
        }
      }

      // Create driver profile
      const driver = await Driver.create(driverData);

      // Handle uploaded documents if any
      const uploadedDocuments = req.uploadedDocuments || {};
      const savedDocuments = [];

      if (Object.keys(uploadedDocuments).length > 0) {
        for (const [documentType, files] of Object.entries(uploadedDocuments)) {
          for (const file of files) {
            // Validate document
            const validation = validateDriverDocuments(file, documentType);
            if (!validation.isValid) {
              await transaction.rollback();
              return res.status(400).json({
                success: false,
                message: validation.message,
                error: "VALIDATION_ERROR",
              });
            }

            // Save document to database
            const [result] = await execute(
              `INSERT INTO driver_documents 
               (driver_id, document_type, file_name, file_path, file_url, file_size, mime_type, upload_status, uploaded_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', NOW())`,
              [
                driver.id,
                documentType,
                file.filename,
                file.path,
                file.url,
                file.size,
                file.mimetype,
              ],
              transaction
            );

            savedDocuments.push({
              documentId: result.insertId,
              documentType,
              fileName: file.filename,
              fileUrl: file.url,
            });

            logger.info("Driver document saved during registration", {
              driverId: driver.id,
              documentType,
              fileName: file.filename,
              documentId: result.insertId,
            });
          }
        }

        // Update driver verification status if documents are uploaded
        const documentTypes = savedDocuments.map((doc) => doc.documentType);
        const hasRequiredDocs =
          DriverController.checkRequiredDocuments(documentTypes);

        if (hasRequiredDocs) {
          await execute(
            `UPDATE drivers SET 
             verification_status = 'pending_review',
             documents_uploaded_at = NOW(),
             updated_at = NOW()
             WHERE id = ?`,
            [driver.id],
            transaction
          );
        }
      }

      await transaction.commit();

      logger.info(`Driver registered: ${driver.id} for user: ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: "Driver registration successful",
        data: {
          driver,
          documentsUploaded: savedDocuments.length,
          documents: savedDocuments,
          verificationRequired: savedDocuments.length > 0,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error("Register driver error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getAllDrivers(req, res) {
    try {
      // Get all drivers with their documents
      const drivers = await Driver.findAllWithDocuments();
      if (drivers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No drivers found",
        });
      }
      res.json({
        success: true,
        data: drivers.map((driver) => ({
          id: driver.id,
          userId: driver.user_id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          isAvailable: driver.is_available,
          documents: driver.documents.map((doc) => ({
            id: doc.id,
            documentType: doc.document_type,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            verificationStatus: doc.verification_status,
            uploadedAt: doc.uploaded_at,
            verifiedAt: doc.verified_at,
          })),
        })),
      });
    } catch (error) {
      logger.error("Get all drivers error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver profile
  static async getDriverProfile(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      // Get driver documents using Sequelize query
      const documents = await sequelize.query(
        `SELECT 
          id, document_type, file_name, file_url, file_size, 
          verification_status, uploaded_at, verified_at
        FROM driver_documents 
        WHERE driver_id = ? AND upload_status != 'deleted'
        ORDER BY uploaded_at DESC`,
        {
          replacements: [driver.id],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.json({
        success: true,
        data: {
          ...driver,
          documents: documents.map((doc) => ({
            id: doc.id,
            documentType: doc.document_type,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            verificationStatus: doc.verification_status,
            uploadedAt: doc.uploaded_at,
            verifiedAt: doc.verified_at,
          })),
        },
      });
    } catch (error) {
      logger.error("Get driver profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Continue with other methods using the same pattern...
  // Replace all instances of:
  // - `const connection = await db.getConnection()` with `const transaction = await sequelize.transaction()`
  // - `await connection.beginTransaction()` (remove this line)
  // - `await connection.execute(...)` with `await execute(..., transaction)`
  // - `await connection.rollback()` with `await transaction.rollback()`
  // - `await connection.commit()` with `await transaction.commit()`
  // - `connection.release()` (remove this line)
  // - `await db.execute(...)` with `await sequelize.query(..., { type: sequelize.QueryTypes.SELECT })`

  static async getVerificationStatus(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Get verification status
      const verificationStatus = await sequelize.query(
        `SELECT

          verification_status, documents_uploaded_at, updated_at
        FROM drivers  
        WHERE id = ?`,
        {
          replacements: [driver.id],
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (verificationStatus.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Verification status not found",
        });
      }
      res.json({
        success: true,
        data: {
          verificationStatus: verificationStatus[0].verification_status,
          documentsUploadedAt: verificationStatus[0].documents_uploaded_at,
          updatedAt: verificationStatus[0].updated_at,
        },
      });
    } catch (error) {
      logger.error("Get verification status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getCurrentDelivery(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Get current delivery
      const currentDelivery = await Delivery.findCurrentByDriverId(driver.id);
      if (!currentDelivery) {
        return res.status(404).json({
          success: false,
          message: "No current delivery found for this driver",
        });
      }
      res.json({
        success: true,
        data: currentDelivery,
      });
    } catch (error) {
      logger.error("Get current delivery error:", error);
      res.status(500).json({
        success: false,

        message: "Internal server error",
      });
    }
  }

  static async getAvailableDeliveries(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Get available deliveries
      const availableDeliveries = await Delivery.findAvailableByDriverId(
        driver.id
      );
      if (availableDeliveries.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No available deliveries found for this driver",
        });
      }
      res.json({
        success: true,
        data: availableDeliveries,
      });
    } catch (error) {
      logger.error("Get available deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update driver profile
  static async updateDriverProfile(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { error, value } = validateDriverUpdate(req.body);
      if (error) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      // Update driver profile
      const updatedDriver = await Driver.update(driver.id, value);

      // Handle uploaded documents if any
      const uploadedFiles = req.uploadedFiles || [];
      const savedDocuments = [];

      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          // Determine document type from filename or default to 'other'
          const documentType =
            DriverController.determineDocumentType(file.filename) || "other";

          // Validate document
          const validation = validateDriverDocuments(file, documentType);
          if (!validation.isValid) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: validation.message,
              error: "VALIDATION_ERROR",
            });
          }

          // Save document to database
          const [result] = await execute(
            `INSERT INTO driver_documents 
             (driver_id, document_type, file_name, file_path, file_url, file_size, mime_type, upload_status, uploaded_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', NOW())`,
            [
              driver.id,
              documentType,
              file.filename,
              file.path,
              file.url,
              file.size,
              file.mimetype,
            ],
            transaction
          );

          savedDocuments.push({
            documentId: result.insertId,
            documentType,
            fileName: file.filename,
            fileUrl: file.url,
          });

          logger.info("Driver document uploaded during profile update", {
            driverId: driver.id,
            documentType,
            fileName: file.filename,
            documentId: result.insertId,
          });
        }
      }

      await transaction.commit();

      res.json({
        success: true,
        message: "Driver profile updated successfully",
        data: {
          driver: updatedDriver,
          documentsUploaded: savedDocuments.length,
          documents: savedDocuments,
        },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error("Update driver profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDriverEarnings(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Get driver earnings
      const earnings = await sequelize.query(
        `SELECT
          SUM(amount) AS total_earnings,
          COUNT(*) AS total_deliveries,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_earnings,
          SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END) AS cancelled_earnings,
          SUM(CASE WHEN status = 'in_progress' THEN amount ELSE 0 END) AS
          in_progress_earnings
        FROM deliveries
        WHERE driver_id = ?`,
        {
          replacements: [driver.id],
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (earnings.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No earnings found for this driver",
        });
      }
      res.json({
        success: true,
        data: {
          totalEarnings: earnings[0].total_earnings || 0,
          totalDeliveries: earnings[0].total_deliveries || 0,
          completedEarnings: earnings[0].completed_earnings || 0,
          cancelledEarnings: earnings[0].cancelled_earnings || 0,
          inProgressEarnings: earnings[0].in_progress_earnings || 0,
        },
      });
    } catch (error) {
      logger.error("Get driver earnings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDriverStats(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Get driver statistics
      const stats = await sequelize.query(
        `SELECT
          COUNT(*) AS total_deliveries,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_deliveries,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_deliveries,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_deliveries,
          AVG(rating) AS average_rating
        FROM deliveries
        WHERE driver_id = ?`,
        {
          replacements: [driver.id],
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (stats.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No delivery statistics found for this driver",
        });
      }
      res.json({
        success: true,
        data: {
          totalDeliveries: stats[0].total_deliveries,
          completedDeliveries: stats[0].completed_deliveries,
          cancelledDeliveries: stats[0].cancelled_deliveries,
          inProgressDeliveries: stats[0].in_progress_deliveries,
          averageRating: stats[0].average_rating || 0, // Handle case where no ratings exist
        },
      });
    } catch (error) {
      logger.error("Get driver statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getVehicleInfo(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Get vehicle information
      const vehicleInfo = await sequelize.query(
        `SELECT
          vehicle_make, vehicle_model, vehicle_year, vehicle_color,
          vehicle_plate_number, vehicle_vin, vehicle_type
        FROM drivers
        WHERE id = ?`,
        {
          replacements: [driver.id],
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (vehicleInfo.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Vehicle information not found for this driver",
        });
      }
      res.json({
        success: true,
        data: {
          vehicleMake: vehicleInfo[0].vehicle_make,
          vehicleModel: vehicleInfo[0].vehicle_model,
          vehicleYear: vehicleInfo[0].vehicle_year,
          vehicleColor: vehicleInfo[0].vehicle_color,
          vehiclePlateNumber: vehicleInfo[0].vehicle_plate_number,
          vehicleVin: vehicleInfo[0].vehicle_vin,
          vehicleType: vehicleInfo[0].vehicle_type,
        },
      });
    } catch (error) {
      logger.error("Get vehicle information error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async toggleAvailability(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      // Toggle availability
      const newAvailability = !driver.is_available;
      await execute(
        `UPDATE drivers SET 
         is_available = ?, updated_at = NOW() 
         WHERE id = ?`,
        [newAvailability, driver.id],
        transaction
      );

      await transaction.commit();

      res.json({
        success: true,
        message: `Driver is now ${newAvailability ? "available" : "unavailable"}`,
        data: { isAvailable: newAvailability },
      });
    } catch (error) {
      await transaction.rollback();
      logger.error("Toggle driver availability error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async deleteDriverDocument(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { documentId } = req.params;
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }
      // Check if document exists
      const [document] = await sequelize.query(
        `SELECT id, document_type, file_name, file_url
         FROM driver_documents


          WHERE id = ? AND driver_id = ? AND upload_status != 'deleted'`,
        {
          replacements: [documentId, driver.id],
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (!document) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Document not found or already deleted",
        });
      }
      // Mark document as deleted
      await execute(
        `UPDATE driver_documents

          SET upload_status = 'deleted', updated_at = NOW()
          WHERE id = ? AND driver_id = ?`,
        [documentId, driver.id],
        transaction
      );
      await transaction.commit();
      res.json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      logger.error("Delete driver document error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Helper methods remain the same
  static determineDocumentType(filename) {
    const lowerFilename = filename.toLowerCase();

    if (lowerFilename.includes("license") || lowerFilename.includes("dl_")) {
      return "driverLicense";
    }
    if (lowerFilename.includes("insurance")) {
      return "insurance";
    }
    if (
      lowerFilename.includes("registration") ||
      lowerFilename.includes("reg_")
    ) {
      return "vehicleRegistration";
    }
    if (lowerFilename.includes("profile") || lowerFilename.includes("photo")) {
      return "profilePhoto";
    }
    if (lowerFilename.includes("inspection")) {
      return "vehicleInspection";
    }

    return "other";
  }

  static async getDriverDeliveries(req, res) {
    try {
      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const deliveries = await Delivery.findByDriverId(driver.id);

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error("Get driver deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async updateLocation(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      // Update driver's location
      await execute(
        `UPDATE drivers SET 
         latitude = ?, longitude = ?, updated_at = NOW() 
         WHERE id = ?`,
        [latitude, longitude, driver.id],
        transaction
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Location updated successfully",
      });
    } catch (error) {
      await transaction.rollback();
      logger.error("Update driver location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static checkRequiredDocuments(documentTypes) {
    const requiredDocs = ["driverLicense", "insurance", "vehicleRegistration"];
    return requiredDocs.every((doc) => documentTypes.includes(doc));
  }
}

module.exports = DriverController;
