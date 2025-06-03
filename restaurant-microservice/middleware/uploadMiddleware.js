const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;

    // Determine upload path based on file type
    if (file.fieldname === "profileImage" || file.fieldname === "bannerImage") {
      uploadPath = path.join(__dirname, "../uploads/restaurants");
    } else if (file.fieldname === "itemImages") {
      uploadPath = path.join(__dirname, "../uploads/items");
    } else if (file.fieldname === "menuImages") {
      uploadPath = path.join(__dirname, "../uploads/menus");
    } else {
      uploadPath = path.join(__dirname, "../uploads/general");
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const extension = path.extname(file.originalname);
    const prefix = file.fieldname || "file";
    cb(null, `${prefix}-${Date.now()}-${uniqueSuffix}${extension}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
      ),
      false
    );
  }
};

// Multer configuration
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files at once
  },
});

// Error handling for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large",
        message: "File size must be less than 10MB",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "Too many files",
        message: "Maximum 5 files can be uploaded at once",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        error: "Unexpected file field",
        message: "Unexpected file field in upload",
      });
    }
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      error: "Invalid file type",
      message: error.message,
    });
  }

  next(error);
};

module.exports = {
  uploadMiddleware,
  handleUploadError,
};
