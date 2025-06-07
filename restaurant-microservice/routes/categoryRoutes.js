const express = require("express");
const router = express.Router();

// Basic category routes with direct handlers
router.get("/", async (req, res, next) => {
  try {
    // Try to use models if available
    let categories = [];
    try {
      const { Category } = require("../models");
      categories = await Category.findAll({
        where: { isActive: true },
        order: [
          ["sortOrder", "ASC"],
          ["name", "ASC"],
        ],
      });
    } catch (error) {
      console.warn("Category model not found, returning empty array");
    }

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:uuid", async (req, res, next) => {
  try {
    const { uuid } = req.params;
    let category = null;

    try {
      const { Category } = require("../models");
      category = await Category.findOne({
        where: { uuid, isActive: true },
      });
    } catch (error) {
      console.warn("Category model not found");
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
