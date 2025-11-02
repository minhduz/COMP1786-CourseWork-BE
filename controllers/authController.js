const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const fs = require("fs");
const path = require("path");

// Register new user with optional avatar
exports.register = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const { username, email, password, phone } = req.body;
    let avatarUrl = "default-avatar.png";

    // Store file path in case we need to delete it
    if (req.file) {
      uploadedFilePath = path.join(__dirname, "../", req.file.path);
    }

    try {
      // Check if user already exists
      const existingUser = db
        .prepare("SELECT user_id FROM users WHERE username = ? OR email = ?")
        .get(username, email);

      if (existingUser) {
        // Delete uploaded file if user already exists
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res
          .status(400)
          .json({ error: "Username or email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Use uploaded avatar if provided
      if (req.file) {
        avatarUrl = `/uploads/${req.file.filename}`;
      }

      // Insert new user
      const result = db
        .prepare(
          "INSERT INTO users (username, email, password, phone, avatar) VALUES (?, ?, ?, ?, ?)"
        )
        .run(username, email, hashedPassword, phone || null, avatarUrl);

      const userId = result.lastInsertRowid;

      // Generate token
      const token = jwt.sign(
        { userId, username, email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.status(201).json({
        message: "User registered successfully",
        user: {
          userId,
          username,
          email,
          phone,
          avatar: avatarUrl,
        },
        token,
      });
    } catch (dbError) {
      // Delete uploaded file if database error
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }

      if (dbError.message.includes("UNIQUE constraint failed")) {
        return res
          .status(400)
          .json({ error: "Username or email already exists" });
      }
      throw dbError;
    }
  } catch (error) {
    // Delete uploaded file if any error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

// Login user with email OR username
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    try {
      let user;

      // If email is provided, search by email
      if (email) {
        user = db
          .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
          .get(email);
      }
      // If username is provided, search by username
      else if (username) {
        user = db
          .prepare("SELECT * FROM users WHERE username = ? AND is_active = 1")
          .get(username);
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.user_id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.json({
        message: "Login successful",
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
        },
        token,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = db
      .prepare(
        "SELECT user_id, username, email, phone, avatar, created_at FROM users WHERE user_id = ?"
      )
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// Update profile - ONLY email, phone, and avatar
exports.updateProfile = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const userId = req.user.userId;
    const { email, phone } = req.body;

    // Store file path in case we need to delete it
    if (req.file) {
      uploadedFilePath = path.join(__dirname, "../", req.file.path);
    }

    try {
      // Check if email is already taken by another user
      if (email) {
        const existingUser = db
          .prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?")
          .get(email, userId);

        if (existingUser) {
          if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
          }
          return res.status(400).json({ error: "Email already taken" });
        }
      }

      // Get current user
      const currentUser = db
        .prepare("SELECT * FROM users WHERE user_id = ?")
        .get(userId);

      if (!currentUser) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(404).json({ error: "User not found" });
      }

      const updates = [];
      const values = [];

      // Only allow email and phone updates
      if (email) {
        updates.push("email = ?");
        values.push(email);
      }
      if (phone) {
        updates.push("phone = ?");
        values.push(phone);
      }

      // Handle avatar update
      let newAvatarUrl = currentUser.avatar;
      if (req.file) {
        newAvatarUrl = `/uploads/${req.file.filename}`;
        updates.push("avatar = ?");
        values.push(newAvatarUrl);
      }

      if (updates.length === 0) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(400).json({ error: "No fields to update" });
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(userId);

      const query = `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`;
      db.prepare(query).run(...values);

      // Delete old avatar if new one was uploaded
      if (
        req.file &&
        currentUser.avatar &&
        currentUser.avatar !== "default_avatar.png"
      ) {
        const oldAvatarPath = path.join(__dirname, "../", currentUser.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      res.json({ message: "Profile updated successfully" });
    } catch (dbError) {
      // Delete uploaded file if database error
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }

      if (dbError.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Email already taken" });
      }
      throw dbError;
    }
  } catch (error) {
    // Delete uploaded file if any error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    try {
      // Get current user
      const user = db
        .prepare("SELECT * FROM users WHERE user_id = ?")
        .get(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify old password
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      db.prepare(
        "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
      ).run(hashedPassword, userId);

      res.json({ message: "Password changed successfully" });
    } catch (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

// Upload avatar (protected)
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user.userId;
    const avatarUrl = `/uploads/${req.file.filename}`;

    // Get current user to delete old avatar
    const currentUser = db
      .prepare("SELECT avatar FROM users WHERE user_id = ?")
      .get(userId);

    if (!currentUser) {
      // Delete uploaded file if user not found
      const filePath = path.join(__dirname, "../", req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ error: "User not found" });
    }

    // Update database
    db.prepare("UPDATE users SET avatar = ? WHERE user_id = ?").run(
      avatarUrl,
      userId
    );

    // Delete old avatar if it exists and isn't default
    if (currentUser.avatar && currentUser.avatar !== "default_avatar.png") {
      const oldAvatarPath = path.join(__dirname, "../", currentUser.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    res.json({
      message: "Avatar uploaded successfully",
      avatarUrl,
    });
  } catch (error) {
    // Delete uploaded file if any error
    if (req.file) {
      const filePath = path.join(__dirname, "../", req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    console.error("Upload avatar error:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};
