

// ----------------------------------------------------------------
// src/middleware/validateLocation.js - Location Validation Middleware
// ----------------------------------------------------------------
const logger = require('../utils/logger');

const validateLocation = (req, res, next) => {
  const { lat, lng, accuracy } = req.body.location || req.body;

  // Check if location data is provided
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'Location coordinates (lat, lng) are required',
      error_code: 'MISSING_LOCATION'
    });
  }

  // Validate latitude range
  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      message: 'Latitude must be between -90 and 90',
        error_code: 'INVALID_LATITUDE'
    });
    }
// Validate longitude range
    
    if (lng < -180 || lng > 180) {
        return res.status(400).json({
            success: false,
            message: 'Longitude must be between -180 and 180',
            error_code: 'INVALID_LONGITUDE'
        });
    }

// Validate accuracy if provided
    if (accuracy && (typeof accuracy !== 'number' || accuracy < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Accuracy must be a non-negative number',
            error_code: 'INVALID_ACCURACY'
        });
    }

    // Log the validated location
    logger.info(`Location validated: lat=${lat}, lng=${lng}, accuracy=${accuracy}`);

    // Proceed to the next middleware or route handler
    next();
};

module.exports = validateLocation;
