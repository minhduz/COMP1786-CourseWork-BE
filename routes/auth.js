const express = require("express");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Manual validation function
const validateRegister = (req, res, next) => {
  const { username, email, password, phone } = req.body;
  const errors = [];

  // Validate username
  if (!username || username.trim().length < 3 || username.trim().length > 50) {
    errors.push({
      field: "username",
      msg: "Username must be between 3 and 50 characters",
    });
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push({
      field: "email",
      msg: "Valid email is required",
    });
  }

  // Validate password
  if (!password || password.length < 8) {
    errors.push({
      field: "password",
      msg: "Password must be at least 8 characters long",
    });
  }

  // If errors exist, return them
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

// Register with validation BEFORE file upload check
router.post(
  "/register",
  upload.single("avatar"),
  validateRegister,
  authController.register
);

// Login with email OR username
router.post(
  "/login",
  (req, res, next) => {
    const { email, username, password } = req.body;
    const errors = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check if either email or username is provided
    if (!email && !username) {
      errors.push({
        field: "email_or_username",
        msg: "Email or username is required",
      });
    }

    // If email is provided, validate it
    if (email && !emailRegex.test(email)) {
      errors.push({
        field: "email",
        msg: "Valid email is required",
      });
    }

    if (!password || password.trim().length === 0) {
      errors.push({
        field: "password",
        msg: "Password is required",
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  },
  authController.login
);

// Get profile (protected)
router.get("/profile", authenticateToken, authController.getProfile);

// Get user by username (public)
router.get(
  "/users/:username",
  authenticateToken,
  authController.getUserByUsername
);

// Update profile - ONLY email, phone, and avatar
router.put(
  "/profile",
  authenticateToken,
  upload.single("avatar"),
  (req, res, next) => {
    const { email, phone } = req.body;
    const errors = [];

    // Validate email if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.push({
        field: "email",
        msg: "Valid email is required",
      });
    }

    if (errors.length > 0) {
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
  },
  authController.updateProfile
);

// Change password (protected)
router.post(
  "/change-password",
  authenticateToken,
  (req, res, next) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    if (!oldPassword || oldPassword.trim().length === 0) {
      errors.push({
        field: "oldPassword",
        msg: "Current password is required",
      });
    }

    if (!newPassword || newPassword.length < 8) {
      errors.push({
        field: "newPassword",
        msg: "New password must be at least 8 characters long",
      });
    }

    if (!confirmPassword || confirmPassword.trim().length === 0) {
      errors.push({
        field: "confirmPassword",
        msg: "Password confirmation is required",
      });
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.push({
        field: "confirmPassword",
        msg: "Passwords do not match",
      });
    }

    if (newPassword && oldPassword && newPassword === oldPassword) {
      errors.push({
        field: "newPassword",
        msg: "New password must be different from current password",
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  },
  authController.changePassword
);

// Upload avatar (protected)
router.post(
  "/avatar",
  authenticateToken,
  upload.single("avatar"),
  authController.uploadAvatar
);

module.exports = router;
