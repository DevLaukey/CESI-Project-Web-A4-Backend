const Driver = require("../models/Driver");
const Delivery = require("../models/Delivery");
const db = require("../config/database");
const logger = require("../utils/logger");
const {
  validateDriver,
  validateDriverUpdate,
  validateDriverDocuments,
} = require("../validators/deliveryValidator");
const externalServices = require("../services/externalServices");

class DriverController {
  // Register as driver
  static async registerDriver(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { error, value } = validateDriver(req.body);
      if (error) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      // Check if user is already a driver
      const existingDriver = await Driver.findByUserId(req.user.id);
      if (existingDriver) {
        await connection.rollback();
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
              await connection.rollback();
              return res.status(400).json({
                success: false,
                message: validation.message,
                error: "VALIDATION_ERROR",
              });
            }

            // Save document to database
            const [result] = await connection.execute(
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
              ]
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
          await connection.execute(
            `UPDATE drivers SET 
             verification_status = 'pending_review',
             documents_uploaded_at = NOW(),
             updated_at = NOW()
             WHERE id = ?`,
            [driver.id]
          );
        }
      }

      await connection.commit();

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
      await connection.rollback();
      logger.error("Register driver error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    } finally {
      connection.release();
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

      // Get driver documents
      const [documents] = await db.execute(
        `SELECT 
          id, document_type, file_name, file_url, file_size, 
          verification_status, uploaded_at, verified_at
        FROM driver_documents 
        WHERE driver_id = ? AND upload_status != 'deleted'
        ORDER BY uploaded_at DESC`,
        [driver.id]
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

  // Update driver profile
  static async updateDriverProfile(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { error, value } = validateDriverUpdate(req.body);
      if (error) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        await connection.rollback();
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
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: validation.message,
              error: "VALIDATION_ERROR",
            });
          }

          // Save document to database
          const [result] = await connection.execute(
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
            ]
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

      await connection.commit();

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
      await connection.rollback();
      logger.error("Update driver profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    } finally {
      connection.release();
    }
  }

  // Upload driver documents
  static async uploadDriverDocuments(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const driverId = req.user.id;
      const uploadedDocuments = req.uploadedDocuments || {};
      const uploadedFiles = req.uploadedFiles || [];

      // Validate that at least one document was uploaded
      if (
        Object.keys(uploadedDocuments).length === 0 &&
        uploadedFiles.length === 0
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "No documents were uploaded",
          error: "NO_DOCUMENTS",
        });
      }

      // Check if driver exists and is active
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }

      const savedDocuments = [];

      // Process multiple field uploads (from driverRegistration middleware)
      if (Object.keys(uploadedDocuments).length > 0) {
        for (const [documentType, files] of Object.entries(uploadedDocuments)) {
          for (const file of files) {
            // Validate document
            const validation = validateDriverDocuments(file, documentType);
            if (!validation.isValid) {
              await connection.rollback();
              return res.status(400).json({
                success: false,
                message: validation.message,
                error: "VALIDATION_ERROR",
              });
            }

            // Save document to database
            const [result] = await connection.execute(
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
              ]
            );

            savedDocuments.push({
              documentId: result.insertId,
              documentType,
              fileName: file.filename,
              fileUrl: file.url,
              fileSize: file.size,
              uploadedAt: new Date(),
            });

            logger.info("Driver document saved to database", {
              driverId: driver.id,
              documentType,
              fileName: file.filename,
              documentId: result.insertId,
            });
          }
        }
      }

      // Process array uploads (from driverProfileUpdate middleware)
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          // Determine document type from filename or default to 'other'
          const documentType =
            DriverController.determineDocumentType(file.filename) || "other";

          // Validate document
          const validation = validateDriverDocuments(file, documentType);
          if (!validation.isValid) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: validation.message,
              error: "VALIDATION_ERROR",
            });
          }

          // Save document to database
          const [result] = await connection.execute(
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
            ]
          );

          savedDocuments.push({
            documentId: result.insertId,
            documentType,
            fileName: file.filename,
            fileUrl: file.url,
            fileSize: file.size,
            uploadedAt: new Date(),
          });

          logger.info("Driver document saved to database", {
            driverId: driver.id,
            documentType,
            fileName: file.filename,
            documentId: result.insertId,
          });
        }
      }

      // Update driver verification status if key documents are uploaded
      const documentTypes = savedDocuments.map((doc) => doc.documentType);
      const hasRequiredDocs =
        DriverController.checkRequiredDocuments(documentTypes);

      if (hasRequiredDocs) {
        await connection.execute(
          `UPDATE drivers SET 
           verification_status = 'pending_review',
           documents_uploaded_at = NOW(),
           updated_at = NOW()
           WHERE id = ?`,
          [driver.id]
        );

        logger.info("Driver verification status updated to pending_review", {
          driverId: driver.id,
          documentCount: savedDocuments.length,
        });
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Documents uploaded successfully",
        data: {
          documentsUploaded: savedDocuments.length,
          documents: savedDocuments,
          verificationStatus: hasRequiredDocs ? "pending_review" : "incomplete",
          requiresReview: hasRequiredDocs,
        },
      });
    } catch (error) {
      await connection.rollback();
      logger.error("Error uploading driver documents:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to upload documents",
        error: "UPLOAD_ERROR",
      });
    } finally {
      connection.release();
    }
  }

  // Get driver documents
  static async getDriverDocuments(req, res) {
    try {
      const driverId = req.user.id;

      // Get driver to verify existence
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }

      // Get driver documents
      const [documents] = await db.execute(
        `SELECT 
          dd.id,
          dd.document_type,
          dd.file_name,
          dd.file_url,
          dd.file_size,
          dd.mime_type,
          dd.upload_status,
          dd.verification_status,
          dd.verification_notes,
          dd.uploaded_at,
          dd.verified_at
        FROM driver_documents dd
        WHERE dd.driver_id = ? AND dd.upload_status != 'deleted'
        ORDER BY dd.uploaded_at DESC`,
        [driver.id]
      );

      // Group documents by type
      const documentsByType = documents.reduce((acc, doc) => {
        if (!acc[doc.document_type]) {
          acc[doc.document_type] = [];
        }
        acc[doc.document_type].push({
          id: doc.id,
          fileName: doc.file_name,
          fileUrl: doc.file_url,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          uploadStatus: doc.upload_status,
          verificationStatus: doc.verification_status,
          verificationNotes: doc.verification_notes,
          uploadedAt: doc.uploaded_at,
          verifiedAt: doc.verified_at,
        });
        return acc;
      }, {});

      res.json({
        success: true,
        message: "Documents retrieved successfully",
        data: {
          totalDocuments: documents.length,
          documentsByType,
          documents: documents.map((doc) => ({
            id: doc.id,
            documentType: doc.document_type,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            uploadStatus: doc.upload_status,
            verificationStatus: doc.verification_status,
            verificationNotes: doc.verification_notes,
            uploadedAt: doc.uploaded_at,
            verifiedAt: doc.verified_at,
          })),
        },
      });
    } catch (error) {
      logger.error("Error retrieving driver documents:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to retrieve documents",
        error: "RETRIEVAL_ERROR",
      });
    }
  }

  // Delete driver document
  static async deleteDriverDocument(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const driverId = req.user.id;
      const documentId = req.params.documentId;

      // Get driver to verify existence
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }

      // Verify document belongs to driver
      const [document] = await connection.execute(
        `SELECT dd.id, dd.file_path, dd.file_name, dd.document_type
         FROM driver_documents dd
         WHERE dd.id = ? AND dd.driver_id = ? AND dd.upload_status != 'deleted'`,
        [documentId, driver.id]
      );

      if (document.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Document not found",
          error: "DOCUMENT_NOT_FOUND",
        });
      }

      // Mark document as deleted (soft delete)
      await connection.execute(
        `UPDATE driver_documents 
         SET upload_status = 'deleted', deleted_at = NOW()
         WHERE id = ?`,
        [documentId]
      );

      // Optionally delete physical file
      const { deleteFile } = require("../middleware/upload");
      const deleted = await deleteFile(document[0].file_path);

      await connection.commit();

      logger.info("Driver document deleted", {
        documentId,
        fileName: document[0].file_name,
        documentType: document[0].document_type,
        physicalFileDeleted: deleted,
        driverId: driver.id,
      });

      res.json({
        success: true,
        message: "Document deleted successfully",
        data: {
          documentId,
          fileName: document[0].file_name,
          physicalFileDeleted: deleted,
        },
      });
    } catch (error) {
      await connection.rollback();
      logger.error("Error deleting driver document:", {
        error: error.message,
        stack: error.stack,
        documentId: req.params.documentId,
        driverId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to delete document",
        error: "DELETE_ERROR",
      });
    } finally {
      connection.release();
    }
  }

  static async setDriverSchedule(req, res) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const driverId = req.user.id;
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }
      const { schedule } = req.body;
      if (!Array.isArray(schedule) || schedule.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid schedule format",
          error: "INVALID_SCHEDULE",
        });
      }
      // Validate schedule entries
      for (const entry of schedule) {
        if (
          !entry.dayOfWeek ||
          !entry.startTime ||
          !entry.endTime ||
          typeof entry.isAvailable !== "boolean"
        ) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Invalid schedule entry format",
            error: "INVALID_SCHEDULE_ENTRY",
          });
        }
        if (
          ![
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].includes(entry.dayOfWeek)
        ) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Invalid day of week",
            error: "INVALID_DAY_OF_WEEK",
          });
        }
        if (
          !/^([01]\d|2[0-3]):([0-5]\d)$/.test(entry.startTime) ||
          !/^([01]\d|2[0-3]):([0-5]\d)$/.test(entry.endTime)
        ) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Invalid time format",
            error: "INVALID_TIME_FORMAT",
          });
        }
        if (entry.startTime >= entry.endTime) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: "Start time must be before end time",
            error: "INVALID_TIME_RANGE",
          });
        }
      }
      // Clear existing schedule
      await connection.execute(
        `DELETE FROM driver_schedule WHERE driver_id = ?`,
        [driver.id]
      );
      // Insert new schedule
      const insertPromises = schedule.map((entry) => {
        return connection.execute(
          `INSERT INTO driver_schedule

            (driver_id, day_of_week, start_time, end_time, is_available)
          VALUES (?, ?, ?, ?, ?)`,
          [
            driver.id,
            entry.dayOfWeek,
            entry.startTime,
            entry.endTime,
            entry.isAvailable,
          ]
        );
      });
      await Promise.all(insertPromises);
      await connection.commit();
      logger.info("Driver schedule updated", {
        driverId: driver.id,
        schedule: schedule.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable,
        })),
      });
      res.json({
        success: true,
        message: "Driver schedule updated successfully",
        data: {
          driverId: driver.id,
          schedule: schedule.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable,
          })),
        },
      });
    } catch (error) {
      await connection.rollback();
      logger.error("Error setting driver schedule:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to set driver schedule",
        error: "SCHEDULE_ERROR",
      });
    } finally {
      connection.release();
    }
  }

  static async getAvailableDeliveries(req, res) {
    try {
      const driverId = req.user.id;
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }
    } catch (error) {
      logger.error("Error getting available deliveries:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get available deliveries",
        error: "DELIVERY_ERROR",
      });
    }
  }

  static async getCurrentDelivery(req, res) {}

  // Get driver verification status
  static async getVerificationStatus(req, res) {
    try {
      const driverId = req.user.id;
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }

      // Get document verification status
      const [documents] = await db.execute(
        `SELECT 
        document_type,
        verification_status,
        verification_notes,
        uploaded_at,
        verified_at
      FROM driver_documents 
      WHERE driver_id = ? AND upload_status != 'deleted'
      ORDER BY uploaded_at DESC`,
        [driver.id]
      );

      // Check which required documents are uploaded and verified
      const requiredDocuments = [
        "driverLicense",
        "insurance",
        "vehicleRegistration",
      ];
      const documentStatus = {};

      requiredDocuments.forEach((docType) => {
        const doc = documents.find((d) => d.document_type === docType);
        documentStatus[docType] = {
          uploaded: !!doc,
          verificationStatus: doc ? doc.verification_status : "not_uploaded",
          verificationNotes: doc ? doc.verification_notes : null,
          uploadedAt: doc ? doc.uploaded_at : null,
          verifiedAt: doc ? doc.verified_at : null,
        };
      });

      // Calculate overall verification status
      const allRequiredUploaded = requiredDocuments.every(
        (doc) => documentStatus[doc].uploaded
      );
      const allRequiredApproved = requiredDocuments.every(
        (doc) => documentStatus[doc].verificationStatus === "approved"
      );
      const anyRejected = requiredDocuments.some(
        (doc) => documentStatus[doc].verificationStatus === "rejected"
      );

      let overallStatus = "incomplete";
      if (anyRejected) {
        overallStatus = "rejected";
      } else if (allRequiredApproved) {
        overallStatus = "verified";
      } else if (allRequiredUploaded) {
        overallStatus = "pending_review";
      }

      // Get additional driver verification info
      const [driverInfo] = await db.execute(
        `SELECT 
        verification_status,
        is_verified,
        documents_uploaded_at,
        verification_completed_at,
        verification_notes
      FROM drivers 
      WHERE id = ?`,
        [driver.id]
      );

      const verificationInfo = driverInfo[0] || {};

      res.json({
        success: true,
        message: "Verification status retrieved successfully",
        data: {
          overallStatus,
          isVerified: driver.is_verified || false,
          canGoOnline: allRequiredApproved && driver.is_verified,
          verificationStatus: verificationInfo.verification_status || "pending",
          documentsUploadedAt: verificationInfo.documents_uploaded_at,
          verificationCompletedAt: verificationInfo.verification_completed_at,
          verificationNotes: verificationInfo.verification_notes,
          requiredDocuments: documentStatus,
          optionalDocuments: documents
            .filter((doc) => !requiredDocuments.includes(doc.document_type))
            .map((doc) => ({
              documentType: doc.document_type,
              verificationStatus: doc.verification_status,
              verificationNotes: doc.verification_notes,
              uploadedAt: doc.uploaded_at,
              verifiedAt: doc.verified_at,
            })),
          missingDocuments: requiredDocuments.filter(
            (doc) => !documentStatus[doc].uploaded
          ),
          rejectedDocuments: requiredDocuments.filter(
            (doc) => documentStatus[doc].verificationStatus === "rejected"
          ),
        },
      });
    } catch (error) {
      logger.error("Error getting verification status:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get verification status",
        error: "VERIFICATION_STATUS_ERROR",
      });
    }
  }

  static async getDriverSchedule(req, res) {
    try {
      const driverId = req.user.id;

      // Get driver to verify existence
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }

      // Get driver's schedule
      const [schedule] = await db.execute(
        `SELECT 
          id, day_of_week, start_time, end_time, is_available 
        FROM driver_schedule 
        WHERE driver_id = ? 
        ORDER BY day_of_week`,
        [driver.id]
      );

      res.json({
        success: true,
        message: "Driver schedule retrieved successfully",
        data: schedule.map((s) => ({
          id: s.id,
          dayOfWeek: s.day_of_week,
          startTime: s.start_time,
          endTime: s.end_time,
          isAvailable: s.is_available,
        })),
      });
    } catch (error) {
      logger.error("Error getting driver schedule:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get driver schedule",
        error: "SCHEDULE_ERROR",
      });
    }
  }

  // Update driver location
  static async updateLocation(req, res) {
    try {
      const { lat, lng } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      await Driver.updateLocation(driver.id, lat, lng);

      // Real-time location update
      const socketManager = req.app.get("socketManager");
      socketManager.updateDriverLocation(req.user.id, { lat, lng });

      res.json({
        success: true,
        message: "Location updated successfully",
      });
    } catch (error) {
      logger.error("Update location error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Toggle availability
  static async toggleAvailability(req, res) {
    try {
      const { available } = req.body;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      if (!driver.is_verified) {
        return res.status(400).json({
          success: false,
          message: "Driver must be verified before going online",
        });
      }

      const updatedDriver = await Driver.updateAvailability(
        driver.id,
        available
      );

      // Real-time availability update
      const socketManager = req.app.get("socketManager");
      socketManager.updateDriverAvailability(req.user.id, available);

      res.json({
        success: true,
        message: `Driver is now ${available ? "available" : "unavailable"}`,
        data: updatedDriver,
      });
    } catch (error) {
      logger.error("Toggle availability error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver deliveries
  static async getDriverDeliveries(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const deliveries = await Delivery.findByDriver(
        driver.id,
        parseInt(limit),
        offset,
        status
      );

      res.json({
        success: true,
        data: deliveries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: deliveries.length,
        },
      });
    } catch (error) {
      logger.error("Get driver deliveries error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get driver statistics
  static async getDriverStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const stats = await Driver.getDriverStats(
        driver.id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: {
          ...stats,
          total_deliveries_lifetime: driver.total_deliveries,
          total_earnings_lifetime: driver.total_earnings,
          current_rating: driver.rating,
        },
      });
    } catch (error) {
      logger.error("Get driver stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getOptimizedRoute(req, res) {
    try {
      const { deliveryIds } = req.body;

      if (!Array.isArray(deliveryIds) || deliveryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery IDs",
        });
      }

      const driver = await Driver.findByUserId(req.user.id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const route = await Delivery.getOptimizedRoute(deliveryIds, driver.id);

      res.json({
        success: true,
        data: route,
      });
    } catch (error) {
      logger.error("Get optimized route error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async getDriverEarnings(req, res) {
    try {
      const driverId = req.user.id;

      // Get driver to verify existence
      const driver = await Driver.findByUserId(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
          error: "DRIVER_NOT_FOUND",
        });
      }

      // Get earnings data
      const earnings = await Driver.getEarnings(driver.id);

      res.json({
        success: true,
        message: "Driver earnings retrieved successfully",
        data: earnings,
      });
    } catch (error) {
      logger.error("Error getting driver earnings:", {
        error: error.message,
        stack: error.stack,
        driverId: req.user.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get driver earnings",
        error: "EARNINGS_ERROR",
      });
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  /**
   * Determine document type from filename
   */
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

  /**
   * Check if required documents are uploaded
   */
  static checkRequiredDocuments(documentTypes) {
    const requiredDocs = ["driverLicense", "insurance", "vehicleRegistration"];
    return requiredDocs.every((doc) => documentTypes.includes(doc));
  }
}

module.exports = DriverController;
