/**
 * Minimal Driver Validators - No validation rules
 * All validation is handled on the frontend
 */

// Driver registration validation - passes everything through
const validateDriverRegistration = (data) => {
  return {
    error: null,
    value: data,
  };
};

// Driver profile update validation - passes everything through
const validateDriverUpdate = (data) => {
  return {
    error: null,
    value: data,
  };
};

// Document validation function - always returns valid
const validateDriverDocuments = (file, documentType) => {
  return {
    isValid: true,
    message: "Document is valid",
  };
};

module.exports = {
  validateDriverRegistration,
  validateDriverUpdate,
  validateDriverDocuments,
};
