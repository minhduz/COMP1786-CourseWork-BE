const express = require("express");
const observationController = require("../controllers/observationController");
const { authenticateToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// All observation routes require authentication
router.use(authenticateToken);

// Manual validation for create observation
const validateCreateObservation = (req, res, next) => {
  const { observation, observationTime, observationType, latitude, longitude } =
    req.body;
  const errors = [];

  // Validate observation
  if (!observation || observation.trim().length === 0) {
    errors.push({
      field: "observation",
      msg: "Observation is required",
    });
  }

  // Validate observation time if provided
  if (observationTime && isNaN(new Date(observationTime).getTime())) {
    errors.push({
      field: "observationTime",
      msg: "Valid observation time is required",
    });
  }

  // Validate observation type if provided
  const validTypes = [
    "Wildlife",
    "Vegetation",
    "Weather",
    "Trail Condition",
    "Other",
  ];
  if (observationType && !validTypes.includes(observationType)) {
    errors.push({
      field: "observationType",
      msg: "Invalid observation type. Must be: Wildlife, Vegetation, Weather, Trail Condition, or Other",
    });
  }

  // Validate latitude if provided
  if (
    latitude !== undefined &&
    (isNaN(latitude) || latitude < -90 || latitude > 90)
  ) {
    errors.push({
      field: "latitude",
      msg: "Valid latitude is required (-90 to 90)",
    });
  }

  // Validate longitude if provided
  if (
    longitude !== undefined &&
    (isNaN(longitude) || longitude < -180 || longitude > 180)
  ) {
    errors.push({
      field: "longitude",
      msg: "Valid longitude is required (-180 to 180)",
    });
  }

  if (errors.length > 0) {
    // Delete uploaded file if validation fails
    if (req.file) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(__dirname, "../", req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(400).json({ errors });
  }

  next();
};

// Manual validation for update observation
const validateUpdateObservation = (req, res, next) => {
  const { observation, observationTime, observationType, latitude, longitude } =
    req.body;
  const errors = [];

  // Validate observation if provided
  if (observation !== undefined && observation.trim().length === 0) {
    errors.push({
      field: "observation",
      msg: "Observation cannot be empty",
    });
  }

  // Validate observation time if provided
  if (observationTime && isNaN(new Date(observationTime).getTime())) {
    errors.push({
      field: "observationTime",
      msg: "Valid observation time is required",
    });
  }

  // Validate observation type if provided
  if (observationType) {
    const validTypes = [
      "Wildlife",
      "Vegetation",
      "Weather",
      "Trail Condition",
      "Other",
    ];
    if (!validTypes.includes(observationType)) {
      errors.push({
        field: "observationType",
        msg: "Invalid observation type. Must be: Wildlife, Vegetation, Weather, Trail Condition, or Other",
      });
    }
  }

  // Validate latitude if provided
  if (
    latitude !== undefined &&
    (isNaN(latitude) || latitude < -90 || latitude > 90)
  ) {
    errors.push({
      field: "latitude",
      msg: "Valid latitude is required (-90 to 90)",
    });
  }

  // Validate longitude if provided
  if (
    longitude !== undefined &&
    (isNaN(longitude) || longitude < -180 || longitude > 180)
  ) {
    errors.push({
      field: "longitude",
      msg: "Valid longitude is required (-180 to 180)",
    });
  }

  if (errors.length > 0) {
    // Delete uploaded file if validation fails
    if (req.file) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(__dirname, "../", req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(400).json({ errors });
  }

  next();
};

// Create observation - ANYONE can add observations to any hike
router.post(
  "/:hikeId/observations",
  upload.single("photo"),
  validateCreateObservation,
  observationController.createObservation
);

// Get all observations for a hike - ANYONE can view
router.get(
  "/:hikeId/observations",
  observationController.getObservationsByHike
);

// Get observation by ID - ANYONE can view
router.get(
  "/observations/:observationId",
  observationController.getObservationById
);

// Update observation - ONLY observation creator can edit
router.put(
  "/observations/:observationId",
  upload.single("photo"),
  validateUpdateObservation,
  observationController.updateObservation
);

// Delete observation - ONLY observation creator can delete
router.delete(
  "/observations/:observationId",
  observationController.deleteObservation
);

module.exports = router;
