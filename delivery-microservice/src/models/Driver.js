const { sequelize } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

class Driver {
  static async createTable() {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS drivers (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL UNIQUE,
          license_number VARCHAR(50) NOT NULL UNIQUE,
          vehicle_type ENUM('bike', 'scooter', 'car', 'truck') NOT NULL,
          vehicle_make VARCHAR(50),
          vehicle_model VARCHAR(50),
          vehicle_year INT,
          vehicle_color VARCHAR(30),
          license_plate VARCHAR(20) NOT NULL,
          insurance_number VARCHAR(100),
          phone_number VARCHAR(20) NOT NULL,
          emergency_contact_name VARCHAR(100),
          emergency_contact_phone VARCHAR(20),
          bank_account_iban VARCHAR(50),
          tax_id VARCHAR(50),
          is_available BOOLEAN DEFAULT FALSE,
          is_verified BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          current_lat DECIMAL(10, 8),
          current_lng DECIMAL(11, 8),
          last_location_update TIMESTAMP,
          rating DECIMAL(3,2) DEFAULT 5.00,
          total_deliveries INT DEFAULT 0,
          total_earnings DECIMAL(10,2) DEFAULT 0.00,
          referral_code VARCHAR(20) UNIQUE,
          referred_by VARCHAR(36),
          background_check_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          verification_status ENUM('pending', 'pending_review', 'approved', 'rejected') DEFAULT 'pending',
          documents_uploaded_at TIMESTAMP NULL,
          verification_completed_at TIMESTAMP NULL,
          verification_notes TEXT,
          documents JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_available (is_available, is_verified, is_active),
          INDEX idx_location (current_lat, current_lng),
          INDEX idx_referral (referral_code),
          INDEX idx_referred_by (referred_by),
          INDEX idx_license (license_number),
          INDEX idx_verification (verification_status)
        )
      `);

      // Create driver_documents table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS driver_documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          driver_id VARCHAR(36) NOT NULL,
          document_type VARCHAR(50) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500),
          file_url VARCHAR(500),
          file_size INT,
          mime_type VARCHAR(100),
          upload_status ENUM('uploaded', 'processing', 'verified', 'rejected', 'deleted') DEFAULT 'uploaded',
          verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          verification_notes TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_at TIMESTAMP NULL,
          deleted_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_driver (driver_id),
          INDEX idx_document_type (document_type),
          INDEX idx_verification_status (verification_status),
          INDEX idx_upload_status (upload_status),
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
        )
      `);

      console.log("✅ Driver tables created successfully!");
    } catch (error) {
      console.error("❌ Error creating driver tables:", error);
      throw error;
    }
  }

  static async create(driverData) {
    try {
      const id = uuidv4();
      const referralCode = this.generateReferralCode();

      const [result] = await sequelize.query(
        `
        INSERT INTO drivers (
          id, user_id, license_number, vehicle_type, vehicle_make,
          vehicle_model, vehicle_year, vehicle_color, license_plate,
          insurance_number, phone_number, emergency_contact_name,
          emergency_contact_phone, bank_account_iban, tax_id,
          referral_code, referred_by, documents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        {
          replacements: [
            id,
            driverData.user_id,
            driverData.license_number,
            driverData.vehicle_type,
            driverData.vehicle_make || null,
            driverData.vehicle_model || null,
            driverData.vehicle_year || null,
            driverData.vehicle_color || null,
            driverData.license_plate,
            driverData.insurance_number || null,
            driverData.phone_number,
            driverData.emergency_contact_name || null,
            driverData.emergency_contact_phone || null,
            driverData.bank_account_iban || null,
            driverData.tax_id || null,
            referralCode,
            driverData.referred_by || null,
            this.safeStringifyDocuments(driverData.documents),
          ],
          type: sequelize.QueryTypes.INSERT,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error creating driver:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM drivers WHERE id = ?",
        {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (results) {
        results.documents = this.safeParseDocuments(results.documents);
      }
      return results || null;
    } catch (error) {
      logger.error("Error finding driver by ID:", error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM drivers WHERE user_id = ?",
        {
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (results) {
        results.documents = this.safeParseDocuments(results.documents);
      }
      return results || null;
    } catch (error) {
      logger.error("Error finding driver by user ID:", error);
      throw error;
    }
  }

  static async findAllWithDocuments() {
    try {
      const drivers = await sequelize.query(
        `
        SELECT 
          d.*,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', dd.id,
              'document_type', dd.document_type,
              'file_name', dd.file_name,
              'file_url', dd.file_url,
              'file_size', dd.file_size,
              'verification_status', dd.verification_status,
              'uploaded_at', dd.uploaded_at,
              'verified_at', dd.verified_at
            )
          ) as documents
        FROM drivers d
        LEFT JOIN driver_documents dd ON d.id = dd.driver_id 
        WHERE dd.upload_status != 'deleted' OR dd.id IS NULL
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return drivers.map((driver) => ({
        ...driver,
        documents: driver.documents ? JSON.parse(driver.documents) : [],
      }));
    } catch (error) {
      logger.error("Error finding all drivers with documents:", error);
      throw error;
    }
  }

  static async findAvailableDrivers(lat, lng, maxDistance = 10) {
    try {
      return await sequelize.query(
        `
        SELECT *, 
          (6371 * acos(cos(radians(?)) * cos(radians(current_lat)) * 
          cos(radians(current_lng) - radians(?)) + sin(radians(?)) * 
          sin(radians(current_lat)))) AS distance
        FROM drivers 
        WHERE is_available = TRUE 
          AND is_verified = TRUE 
          AND is_active = TRUE
          AND current_lat IS NOT NULL 
          AND current_lng IS NOT NULL
        HAVING distance <= ?
        ORDER BY distance ASC
        LIMIT 20
      `,
        {
          replacements: [lat, lng, lat, maxDistance],
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } catch (error) {
      logger.error("Error finding available drivers:", error);
      throw error;
    }
  }

  static async updateLocation(id, lat, lng) {
    try {
      await sequelize.query(
        `
        UPDATE drivers 
        SET current_lat = ?, current_lng = ?, last_location_update = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        {
          replacements: [lat, lng, id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating driver location:", error);
      throw error;
    }
  }

  static async updateAvailability(id, isAvailable) {
    try {
      await sequelize.query(
        `
        UPDATE drivers 
        SET is_available = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
        {
          replacements: [isAvailable, id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating driver availability:", error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const setClause = [];
      const replacements = [];

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          setClause.push(`${key} = ?`);
          replacements.push(updateData[key]);
        }
      });

      if (setClause.length === 0) {
        return this.findById(id);
      }

      setClause.push("updated_at = CURRENT_TIMESTAMP");
      replacements.push(id);

      await sequelize.query(
        `
        UPDATE drivers 
        SET ${setClause.join(", ")}
        WHERE id = ?
      `,
        {
          replacements,
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating driver:", error);
      throw error;
    }
  }

  static async updateRating(id, newRating) {
    try {
      await sequelize.query(
        `
        UPDATE drivers 
        SET rating = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
        {
          replacements: [newRating, id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating driver rating:", error);
      throw error;
    }
  }

  static async incrementDeliveries(id, earnings = 0) {
    try {
      await sequelize.query(
        `
        UPDATE drivers 
        SET total_deliveries = total_deliveries + 1,
            total_earnings = total_earnings + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        {
          replacements: [earnings, id],
          type: sequelize.QueryTypes.UPDATE,
        }
      );

      return this.findById(id);
    } catch (error) {
      logger.error("Error incrementing driver deliveries:", error);
      throw error;
    }
  }

  static async getDriverStats(driverId, startDate = null, endDate = null) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_deliveries,
          SUM(delivery_fee) as total_earnings,
          AVG(delivery_time_minutes) as avg_delivery_time,
          AVG(customer_rating) as avg_rating
        FROM deliveries 
        WHERE driver_id = ? AND status = 'delivered'
      `;
      let replacements = [driverId];

      if (startDate) {
        sql += " AND created_at >= ?";
        replacements.push(startDate);
      }

      if (endDate) {
        sql += " AND created_at <= ?";
        replacements.push(endDate);
      }

      const [results] = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return results;
    } catch (error) {
      logger.error("Error getting driver stats:", error);
      throw error;
    }
  }

  static async findByReferralCode(referralCode) {
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM drivers WHERE referral_code = ?",
        {
          replacements: [referralCode],
          type: sequelize.QueryTypes.SELECT,
        }
      );

      return results || null;
    } catch (error) {
      logger.error("Error finding driver by referral code:", error);
      throw error;
    }
  }

  static generateReferralCode() {
    return "DRV" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Helper method to safely parse JSON documents
  static safeParseDocuments(documents) {
    if (!documents) {
      return {};
    }

    if (typeof documents === "object") {
      return documents;
    }

    if (typeof documents === "string") {
      try {
        return JSON.parse(documents);
      } catch (error) {
        console.warn("Failed to parse documents JSON:", error);
        return {};
      }
    }

    return {};
  }

  // Helper method to safely stringify documents
  static safeStringifyDocuments(documents) {
    if (!documents) {
      return "{}";
    }

    if (typeof documents === "string") {
      // Validate it's valid JSON
      try {
        JSON.parse(documents);
        return documents;
      } catch (error) {
        return "{}";
      }
    }

    if (typeof documents === "object") {
      try {
        return JSON.stringify(documents);
      } catch (error) {
        return "{}";
      }
    }

    return "{}";
  }
}

module.exports = Driver;
