const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const logger = require("../utils/logger");

/**
 * Upload Middleware
 * Handles file uploads for delivery service (photos, documents, etc.)
 */

// Ensure upload directories exist
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
const tempDir = path.join(uploadDir, "temp");
const deliveryPhotosDir = path.join(uploadDir, "delivery-photos");
const signatureDir = path.join(uploadDir, "signatures");
const documentsDir = path.join(uploadDir, "documents");

[uploadDir, tempDir, deliveryPhotosDir, signatureDir, documentsDir].forEach(
  (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
);

// File type configurations
const fileTypes = {
  images: /jpeg|jpg|png|gif|webp/,
  documents: /pdf|doc|docx|txt/,
  signatures: /png|jpg|jpeg|svg/,
};

// File size limits (in bytes)
const fileSizeLimits = {
  deliveryPhoto: 5 * 1024 * 1024, // 5MB
  signature: 2 * 1024 * 1024, // 2MB
  document: 10 * 1024 * 1024, // 10MB
  profilePhoto: 3 * 1024 * 1024, // 3MB
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName, prefix = "") => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName).toLowerCase();
  return `${prefix}${timestamp}_${random}${ext}`;
};

/**
 * Storage configuration for different upload types
 */
const createStorage = (destination, filePrefix = "") => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const filename = generateFileName(file.originalname, filePrefix);
      cb(null, filename);
    },
  });
};

/**
 * File filter function
 */
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const error = new Error(
        `Invalid file type. Allowed types: ${allowedTypes.source}`
      );
      error.code = "INVALID_FILE_TYPE";
      cb(error);
    }
  };
};

/**
 * Base upload configuration
 */
const createUploadConfig = (
  destination,
  allowedTypes,
  maxSize,
  filePrefix = ""
) => {
  return multer({
    storage: createStorage(destination, filePrefix),
    limits: {
      fileSize: maxSize,
      files: 5, // Maximum 5 files per request
    },
    fileFilter: createFileFilter(allowedTypes),
  });
};

// ================================================================
// UPLOAD MIDDLEWARE CONFIGURATIONS
// ================================================================

/**
 * Delivery photo upload (proof of delivery)
 */
const uploadDeliveryPhoto = createUploadConfig(
  deliveryPhotosDir,
  fileTypes.images,
  fileSizeLimits.deliveryPhoto,
  "delivery_"
);

/**
 * Signature upload (digital signatures)
 */
const uploadSignature = createUploadConfig(
  signatureDir,
  fileTypes.signatures,
  fileSizeLimits.signature,
  "signature_"
);

/**
 * Document upload (driver documents, etc.)
 */
const uploadDocument = createUploadConfig(
  documentsDir,
  fileTypes.documents,
  fileSizeLimits.document,
  "doc_"
);

/**
 * Driver documents upload configuration
 */
const uploadDriverDocs = multer({
  storage: createStorage(documentsDir, "driver_"),
  limits: {
    fileSize: fileSizeLimits.document,
    files: 10, // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow both documents and images for driver documents
    const documentTypes = /pdf|doc|docx|txt/;
    const imageTypes = /jpeg|jpg|png|gif|webp/;

    const extname =
      documentTypes.test(path.extname(file.originalname).toLowerCase()) ||
      imageTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype =
      documentTypes.test(file.mimetype) || imageTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const error = new Error(
        "Invalid file type. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG"
      );
      error.code = "INVALID_FILE_TYPE";
      cb(error);
    }
  },
});

/**
 * Multiple file upload for delivery issues
 */
const uploadIssuePhotos = createUploadConfig(
  deliveryPhotosDir,
  fileTypes.images,
  fileSizeLimits.deliveryPhoto,
  "issue_"
);

// ================================================================
// MIDDLEWARE FUNCTIONS
// ================================================================

/**
 * Single delivery photo upload
 */
const singleDeliveryPhoto = (req, res, next) => {
  const upload = uploadDeliveryPhoto.single("delivery_photo");

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    if (req.file) {
      req.uploadedFile = {
        ...req.file,
        url: `/uploads/delivery-photos/${req.file.filename}`,
        type: "delivery_photo",
      };

      logger.info("Delivery photo uploaded", {
        filename: req.file.filename,
        size: req.file.size,
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Multiple delivery photos upload
 */
const multipleDeliveryPhotos = (req, res, next) => {
  const upload = uploadDeliveryPhoto.array("delivery_photos", 5);

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    if (req.files && req.files.length > 0) {
      req.uploadedFiles = req.files.map((file) => ({
        ...file,
        url: `/uploads/delivery-photos/${file.filename}`,
        type: "delivery_photo",
      }));

      logger.info("Multiple delivery photos uploaded", {
        count: req.files.length,
        totalSize: req.files.reduce((sum, file) => sum + file.size, 0),
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Signature upload
 */
const singleSignature = (req, res, next) => {
  const upload = uploadSignature.single("signature");

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    if (req.file) {
      req.uploadedFile = {
        ...req.file,
        url: `/uploads/signatures/${req.file.filename}`,
        type: "signature",
      };

      logger.info("Signature uploaded", {
        filename: req.file.filename,
        size: req.file.size,
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Document upload
 */
const singleDocument = (req, res, next) => {
  const upload = uploadDocument.single("document");

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    if (req.file) {
      req.uploadedFile = {
        ...req.file,
        url: `/uploads/documents/${req.file.filename}`,
        type: "document",
      };

      logger.info("Document uploaded", {
        filename: req.file.filename,
        size: req.file.size,
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Issue photos upload (for delivery issues)
 */
const issuePhotos = (req, res, next) => {
  const upload = uploadIssuePhotos.array("issue_photos", 5);

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    if (req.files && req.files.length > 0) {
      req.uploadedFiles = req.files.map((file) => ({
        ...file,
        url: `/uploads/delivery-photos/${file.filename}`,
        type: "issue_photo",
      }));

      logger.info("Issue photos uploaded", {
        count: req.files.length,
        totalSize: req.files.reduce((sum, file) => sum + file.size, 0),
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Driver documents upload (license, insurance, vehicle registration, etc.)
 */
const driverDocuments = (req, res, next) => {
  const upload = uploadDriverDocs.fields([
    { name: "drivers_license", maxCount: 2 }, // Front and back
    { name: "insurance_certificate", maxCount: 1 },
    { name: "vehicle_registration", maxCount: 1 },
    { name: "vehicle_inspection", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 },
    { name: "background_check", maxCount: 1 },
    { name: "other_documents", maxCount: 3 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    req.uploadedDocuments = {};

    // Process each document type
    if (req.files) {
      Object.keys(req.files).forEach((fieldName) => {
        req.uploadedDocuments[fieldName] = req.files[fieldName].map((file) => ({
          ...file,
          url: `/uploads/documents/${file.filename}`,
          type: fieldName,
          uploadedAt: new Date(),
        }));
      });

      logger.info("Driver documents uploaded", {
        documentTypes: Object.keys(req.uploadedDocuments),
        totalFiles: Object.values(req.uploadedDocuments).flat().length,
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Vehicle documents upload (registration, insurance, inspection)
 */
const vehicleDocuments = (req, res, next) => {
  const upload = uploadDriverDocs.fields([
    { name: "vehicle_registration", maxCount: 1 },
    { name: "vehicle_insurance", maxCount: 1 },
    { name: "vehicle_inspection", maxCount: 1 },
    { name: "vehicle_photos", maxCount: 5 },
    { name: "vehicle_documents", maxCount: 3 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    req.uploadedDocuments = {};

    // Process each document type
    if (req.files) {
      Object.keys(req.files).forEach((fieldName) => {
        req.uploadedDocuments[fieldName] = req.files[fieldName].map((file) => ({
          ...file,
          url: `/uploads/documents/${file.filename}`,
          type: fieldName,
          uploadedAt: new Date(),
        }));
      });

      logger.info("Vehicle documents uploaded", {
        documentTypes: Object.keys(req.uploadedDocuments),
        totalFiles: Object.values(req.uploadedDocuments).flat().length,
        userId: req.user?.id,
      });
    }

    next();
  });
};

/**
 * Mixed upload (delivery photo + signature)
 */
const deliveryProof = (req, res, next) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        if (file.fieldname === "delivery_photo") {
          cb(null, deliveryPhotosDir);
        } else if (file.fieldname === "signature") {
          cb(null, signatureDir);
        } else {
          cb(null, tempDir);
        }
      },
      filename: (req, file, cb) => {
        let prefix = "";
        if (file.fieldname === "delivery_photo") prefix = "delivery_";
        if (file.fieldname === "signature") prefix = "signature_";

        const filename = generateFileName(file.originalname, prefix);
        cb(null, filename);
      },
    }),
    limits: {
      fileSize: Math.max(
        fileSizeLimits.deliveryPhoto,
        fileSizeLimits.signature
      ),
      files: 2,
    },
    fileFilter: (req, file, cb) => {
      if (
        file.fieldname === "delivery_photo" ||
        file.fieldname === "signature"
      ) {
        const extname = fileTypes.images.test(
          path.extname(file.originalname).toLowerCase()
        );
        const mimetype = fileTypes.images.test(file.mimetype);

        if (mimetype && extname) {
          return cb(null, true);
        }
      }

      const error = new Error("Invalid file type or field name");
      error.code = "INVALID_FILE_TYPE";
      cb(error);
    },
  }).fields([
    { name: "delivery_photo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleUploadError(err, res);
    }

    req.uploadedFiles = {};

    if (req.files.delivery_photo) {
      const file = req.files.delivery_photo[0];
      req.uploadedFiles.delivery_photo = {
        ...file,
        url: `/uploads/delivery-photos/${file.filename}`,
        type: "delivery_photo",
      };
    }

    if (req.files.signature) {
      const file = req.files.signature[0];
      req.uploadedFiles.signature = {
        ...file,
        url: `/uploads/signatures/${file.filename}`,
        type: "signature",
      };
    }

    logger.info("Delivery proof uploaded", {
      deliveryPhoto: !!req.uploadedFiles.delivery_photo,
      signature: !!req.uploadedFiles.signature,
      userId: req.user?.id,
    });

    next();
  });
};

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Handle upload errors
 */
const handleUploadError = (err, res) => {
  logger.error("File upload error:", err);

  let message = "File upload failed";
  let statusCode = 500;

  if (err.code === "LIMIT_FILE_SIZE") {
    message = "File too large";
    statusCode = 413;
  } else if (err.code === "LIMIT_FILE_COUNT") {
    message = "Too many files";
    statusCode = 413;
  } else if (err.code === "INVALID_FILE_TYPE") {
    message = err.message;
    statusCode = 400;
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    message = "Unexpected field name";
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: err.code,
  });
};

/**
 * Delete uploaded file
 */
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(uploadDir, filePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.info("File deleted", { filePath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Error deleting file:", error);
    return false;
  }
};

/**
 * Clean up old files
 */
const cleanupOldFiles = async (directory, maxAgeHours = 24) => {
  try {
    const files = await fs.promises.readdir(directory);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        logger.info("Old file cleaned up", { file: filePath });
      }
    }
  } catch (error) {
    logger.error("Error cleaning up files:", error);
  }
};

/**
 * Get file info
 */
const getFileInfo = (filename, type = "delivery_photo") => {
  let directory;
  switch (type) {
    case "signature":
      directory = "signatures";
      break;
    case "document":
      directory = "documents";
      break;
    default:
      directory = "delivery-photos";
  }

  return {
    filename,
    url: `/uploads/${directory}/${filename}`,
    path: path.join(uploadDir, directory, filename),
    type,
  };
};

/**
 * Validate uploaded files
 */
const validateUploadedFiles = (req, res, next) => {
  // Additional validation can be added here
  // e.g., virus scanning, image processing, etc.
  next();
};

module.exports = {
  // Main upload functions
  singleDeliveryPhoto,
  multipleDeliveryPhotos,
  singleSignature,
  singleDocument,
  issuePhotos,
  deliveryProof,

  // Driver and vehicle uploads
  driverDocuments,
  vehicleDocuments,

  // Utility functions
  validateUploadedFiles,
  deleteFile,
  cleanupOldFiles,
  getFileInfo,
  uploadDir,
};
