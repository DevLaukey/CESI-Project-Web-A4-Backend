

const express = require('express');
const PreferencesController = require('../controllers/PreferencesController');
const { validatePreferences, validatePhoneTest } = require('../middleware/validation');

const router = express.Router();

// Get user preferences
router.get('/:userId', PreferencesController.getUserPreferences);

// Create or update preferences
router.post('/', 
  validatePreferences,
  PreferencesController.createOrUpdatePreferences
);

// Update specific preferences
router.patch('/:userId', 
  validatePreferences,
  PreferencesController.createOrUpdatePreferences
);

// Delete user preferences
router.delete('/:userId', PreferencesController.deleteUserPreferences);

// Test phone number validation
router.post('/test-phone', 
  validatePhoneTest,
  PreferencesController.testPhoneNumber
);

module.exports = router;