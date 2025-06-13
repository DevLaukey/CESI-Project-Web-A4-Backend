const NotificationTemplate = require("../models/NotificationTemplate");
const logger = require("../utils/logger");
const { validateTemplate } = require("../validators/notificationValidator");

class TemplateController {
  // Create notification template
  static async createTemplate(req, res) {
    try {
      if (!["admin", "support"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { error, value } = validateTemplate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const template = await NotificationTemplate.create(value);

      logger.info(
        `Template created: ${template.name} (${template.id}) by user: ${req.user.id}`
      );

      res.status(201).json({
        success: true,
        message: "Template created successfully",
        data: template,
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "Template name already exists",
        });
      }

      logger.error("Create template error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get templates
  static async getTemplates(req, res) {
    try {
      const { type, active_only = true } = req.query;

      let templates;
      if (type) {
        templates = await NotificationTemplate.findByType(type);
      } else {
        templates = await NotificationTemplate.findAll(active_only === "true");
      }

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error("Get templates error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get specific template
  static async getTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await NotificationTemplate.findById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error("Get template error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update template
  static async updateTemplate(req, res) {
    try {
      if (!["admin", "support"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { id } = req.params;
      const { error, value } = validateTemplate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const template = await NotificationTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      const updatedTemplate = await NotificationTemplate.update(id, value);

      logger.info(
        `Template updated: ${template.name} (${id}) by user: ${req.user.id}`
      );

      res.json({
        success: true,
        message: "Template updated successfully",
        data: updatedTemplate,
      });
    } catch (error) {
      logger.error("Update template error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete template
  static async deleteTemplate(req, res) {
    try {
      if (!["admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { id } = req.params;

      const template = await NotificationTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      await NotificationTemplate.deactivate(id);

      logger.info(
        `Template deactivated: ${template.name} (${id}) by user: ${req.user.id}`
      );

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      logger.error("Delete template error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Test template rendering
  static async testTemplate(req, res) {
    try {
      const { id } = req.params;
      const { variables = {} } = req.body;

      const rendered = await NotificationTemplate.renderTemplate(id, variables);

      if (!rendered) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      res.json({
        success: true,
        message: "Template rendered successfully",
        data: rendered,
      });
    } catch (error) {
      logger.error("Test template error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get template usage statistics
  static async getTemplateStats(req, res) {
    try {
      if (!["admin", "support"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { id } = req.params;
      const { start_date, end_date } = req.query;

      const stats = await NotificationTemplate.getUsageStats(
        id,
        start_date,
        end_date
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get template stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = TemplateController;
