const express = require("express");
const hikeController = require("../controllers/hikeController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All hike routes require authentication
router.use(authenticateToken);

// Manual validation for create hike
const validateCreateHike = (req, res, next) => {
  const {
    name,
    location,
    hikeDate,
    parkingAvailable,
    length,
    difficultyLevel,
  } = req.body;
  const errors = [];

  // Validate name
  if (!name || name.trim().length === 0) {
    errors.push({
      field: "name",
      msg: "Hike name is required",
    });
  }

  // Validate location
  if (!location || location.trim().length === 0) {
    errors.push({
      field: "location",
      msg: "Location is required",
    });
  }

  // Validate hike date
  if (!hikeDate || isNaN(new Date(hikeDate).getTime())) {
    errors.push({
      field: "hikeDate",
      msg: "Valid date is required",
    });
  }

  // Validate parking available
  if (
    parkingAvailable === undefined ||
    parkingAvailable === null ||
    parkingAvailable === ""
  ) {
    errors.push({
      field: "parkingAvailable",
      msg: "Parking availability is required",
    });
  }
  if (
    parkingAvailable !== undefined &&
    typeof parkingAvailable !== "boolean" &&
    parkingAvailable !== "true" &&
    parkingAvailable !== "false"
  ) {
    errors.push({
      field: "parkingAvailable",
      msg: "Parking availability must be boolean",
    });
  }

  // Validate length
  if (!length || isNaN(length) || parseFloat(length) <= 0) {
    errors.push({
      field: "length",
      msg: "Length must be a positive number",
    });
  }

  // Validate difficulty level
  const validDifficulty = ["Easy", "Moderate", "Difficult", "Expert"];
  if (!difficultyLevel || !validDifficulty.includes(difficultyLevel)) {
    errors.push({
      field: "difficultyLevel",
      msg: "Invalid difficulty level. Must be: Easy, Moderate, Difficult, or Expert",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Manual validation for update hike
const validateUpdateHike = (req, res, next) => {
  const {
    name,
    location,
    hikeDate,
    parkingAvailable,
    length,
    difficultyLevel,
  } = req.body;
  const errors = [];

  // Validate name if provided
  if (name !== undefined && name.trim().length === 0) {
    errors.push({
      field: "name",
      msg: "Hike name cannot be empty",
    });
  }

  // Validate location if provided
  if (location !== undefined && location.trim().length === 0) {
    errors.push({
      field: "location",
      msg: "Location cannot be empty",
    });
  }

  // Validate hike date if provided
  if (hikeDate !== undefined && isNaN(new Date(hikeDate).getTime())) {
    errors.push({
      field: "hikeDate",
      msg: "Valid date is required",
    });
  }

  // Validate parking available if provided
  if (
    parkingAvailable !== undefined &&
    parkingAvailable !== null &&
    parkingAvailable !== "" &&
    typeof parkingAvailable !== "boolean" &&
    parkingAvailable !== "true" &&
    parkingAvailable !== "false"
  ) {
    errors.push({
      field: "parkingAvailable",
      msg: "Parking availability must be boolean",
    });
  }

  // Validate length if provided
  if (length !== undefined && (isNaN(length) || parseFloat(length) <= 0)) {
    errors.push({
      field: "length",
      msg: "Length must be a positive number",
    });
  }

  // Validate difficulty level if provided
  if (difficultyLevel !== undefined) {
    const validDifficulty = ["Easy", "Moderate", "Difficult", "Expert"];
    if (!validDifficulty.includes(difficultyLevel)) {
      errors.push({
        field: "difficultyLevel",
        msg: "Invalid difficulty level. Must be: Easy, Moderate, Difficult, or Expert",
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Manual validation for search
const validateSearch = (req, res, next) => {
  const { name } = req.query;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push({
      field: "name",
      msg: "Search query is required",
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// ⭐ SEARCH ROUTES FIRST (specific routes before dynamic :id routes)
// Search by name
router.get("/search/name", validateSearch, hikeController.searchHikesByName);

// Advanced search
router.get("/search/advanced", hikeController.advancedSearchHikes);

// ⭐ NEW ROUTE: Get all hikes from all users
router.get("/all", hikeController.getAllHikes);

// ⭐ THEN GENERAL ROUTES
// Get all user hikes (current user only)
router.get("/", hikeController.getUserHikes);

// Create hike
router.post("/", validateCreateHike, hikeController.createHike);

// ⭐ THEN DYNAMIC ROUTES (/:id routes MUST be last)
// Get hike by ID
router.get("/:hikeId", hikeController.getHikeById);

// Update hike
router.put("/:hikeId", validateUpdateHike, hikeController.updateHike);

// Delete hike
router.delete("/:hikeId", hikeController.deleteHike);

// Search ALL hikes by name (from all users)
router.get("/search/all/name", hikeController.searchAllHikesByName);

module.exports = router;
