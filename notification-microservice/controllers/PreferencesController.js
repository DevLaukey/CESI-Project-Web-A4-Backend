const UserPreferences = require("../models/UserPreferences");
const TwilioService = require("../services/TwilioService");
const { validationResult } = require("express-validator");

class PreferencesController {
  async getUserPreferences(req, res) {
    try {
      const { userId } = req.params;

      const preferences = await UserPreferences.findOne({ userId });

      if (!preferences) {
        return res.status(404).json({
          error: "User preferences not found",
        });
      }

      res.json(preferences);
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve preferences",
        message: error.message,
      });
    }
  }

  async createOrUpdatePreferences(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userId, phone } = req.body;

      // Validate phone number if provided
      if (phone) {
        const phoneValidation = await TwilioService.validatePhoneNumber(phone);
        if (!phoneValidation.valid) {
          return res.status(400).json({
            error: "Invalid phone number",
            details: phoneValidation.error,
          });
        }
      }

      const preferences = await UserPreferences.findOneAndUpdate(
        { userId },
        req.body,
        { upsert: true, new: true, runValidators: true }
      );

      res.status(201).json(preferences);
    } catch (error) {
      res.status(500).json({
        error: "Failed to update preferences",
        message: error.message,
      });
    }
  }

  async deleteUserPreferences(req, res) {
    try {
      const { userId } = req.params;

      const result = await UserPreferences.findOneAndDelete({ userId });

      if (!result) {
        return res.status(404).json({
          error: "User preferences not found",
        });
      }

      res.json({ message: "Preferences deleted successfully" });
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete preferences",
        message: error.message,
      });
    }
  }

  async testPhoneNumber(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          error: "Phone number required",
        });
      }

      const validation = await TwilioService.validatePhoneNumber(phone);
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: "Failed to validate phone number",
        message: error.message,
      });
    }
  }
}

module.exports = new PreferencesController();
