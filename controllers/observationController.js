const db = require("../config/database");
const fs = require("fs");
const path = require("path");

// Create observation - ANYONE can add to any hike
exports.createObservation = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const userId = req.user.userId;
    const { hikeId } = req.params;
    const {
      observation,
      observationTime,
      comments,
      observationType,
      latitude,
      longitude,
    } = req.body;

    if (req.file) {
      uploadedFilePath = path.join(__dirname, "../", req.file.path);
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    try {
      // Verify hike exists - anyone can add observation, no ownership check needed
      const hike = db
        .prepare("SELECT hike_id FROM hikes WHERE hike_id = ?")
        .get(hikeId);

      if (!hike) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(404).json({ error: "Hike not found" });
      }

      const result = db
        .prepare(
          `INSERT INTO observations (
          hike_id, user_id, observation, observation_time, comments,
          observation_type, photo_url, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          hikeId,
          userId,
          observation,
          observationTime || new Date().toISOString(),
          comments || null,
          observationType || null,
          photoUrl,
          latitude || null,
          longitude || null
        );

      const observationId = result.lastInsertRowid;

      res.status(201).json({
        message: "Observation created successfully",
        observationId,
        observation: {
          observationId,
          hikeId,
          userId,
          observation,
          observationTime,
          photoUrl,
        },
      });
    } catch (dbError) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      console.error("Database error:", dbError);
      throw dbError;
    }
  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    console.error("Create observation error:", error);
    res.status(500).json({ error: "Failed to create observation" });
  }
};

// Get all observations for a hike - ANYONE can view
exports.getObservationsByHike = async (req, res) => {
  try {
    const { hikeId } = req.params;

    // Verify hike exists - no ownership check needed
    const hike = db
      .prepare("SELECT hike_id FROM hikes WHERE hike_id = ?")
      .get(hikeId);

    if (!hike) {
      return res.status(404).json({ error: "Hike not found" });
    }

    const observations = db
      .prepare(
        `SELECT o.*, u.username, u.avatar, u.email
       FROM observations o
       LEFT JOIN users u ON o.user_id = u.user_id
       WHERE o.hike_id = ?
       ORDER BY o.observation_time DESC`
      )
      .all(hikeId);

    res.json({
      count: observations.length,
      observations: observations.map((o) => ({
        observationId: o.observation_id,
        hikeId: o.hike_id,
        userId: o.user_id,
        observation: o.observation,
        observationTime: o.observation_time,
        comments: o.comments,
        observationType: o.observation_type,
        photoUrl: o.photo_url,
        latitude: o.latitude,
        longitude: o.longitude,
        username: o.username,
        userAvatar: o.avatar,
        userEmail: o.email,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      })),
    });
  } catch (error) {
    console.error("Get observations by hike error:", error);
    res.status(500).json({ error: "Failed to fetch observations" });
  }
};

// Get observation by ID - ANYONE can view
exports.getObservationById = async (req, res) => {
  try {
    const { observationId } = req.params;

    const observation = db
      .prepare(
        `SELECT o.*, u.username, u.avatar, u.email, h.hike_id
       FROM observations o
       LEFT JOIN users u ON o.user_id = u.user_id
       LEFT JOIN hikes h ON o.hike_id = h.hike_id
       WHERE o.observation_id = ?`
      )
      .get(observationId);

    if (!observation) {
      return res.status(404).json({ error: "Observation not found" });
    }

    res.json({
      observationId: observation.observation_id,
      hikeId: observation.hike_id,
      userId: observation.user_id,
      observation: observation.observation,
      observationTime: observation.observation_time,
      comments: observation.comments,
      observationType: observation.observation_type,
      photoUrl: observation.photo_url,
      latitude: observation.latitude,
      longitude: observation.longitude,
      username: observation.username,
      userAvatar: observation.avatar,
      userEmail: observation.email,
      createdAt: observation.created_at,
      updatedAt: observation.updated_at,
    });
  } catch (error) {
    console.error("Get observation by ID error:", error);
    res.status(500).json({ error: "Failed to fetch observation" });
  }
};

// Update observation - ONLY observation creator can edit
exports.updateObservation = async (req, res) => {
  let uploadedFilePath = null;

  try {
    const userId = req.user.userId;
    const { observationId } = req.params;
    const { deletePhoto } = req.body;

    if (req.file) {
      uploadedFilePath = path.join(__dirname, "../", req.file.path);
    }

    // Verify ownership - ONLY observation creator can edit
    const observation = db
      .prepare(
        "SELECT user_id, photo_url FROM observations WHERE observation_id = ?"
      )
      .get(observationId);

    if (!observation) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      return res.status(404).json({ error: "Observation not found" });
    }

    // Check if user is the observation creator (NOT hike owner)
    if (observation.user_id !== userId) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      return res
        .status(403)
        .json({ error: "Not authorized to update this observation" });
    }

    // Build update query
    const updates = [];
    const values = [];
    const allowedFields = [
      "observation",
      "observation_time",
      "comments",
      "observation_type",
      "latitude",
      "longitude",
    ];

    for (const field of allowedFields) {
      const camelCase = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (req.body[camelCase] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[camelCase]);
      }
    }

    // Handle photo deletion or update
    let oldPhotoPath = null;

    if (deletePhoto === "true") {
      // User wants to delete the photo
      updates.push("photo_url = NULL");

      // Store old photo path to delete after successful update
      if (
        observation.photo_url &&
        observation.photo_url !== "default_photo.png"
      ) {
        oldPhotoPath = path.join(__dirname, "../", observation.photo_url);
      }
    } else if (req.file) {
      // User is uploading a new photo
      updates.push("photo_url = ?");
      values.push(`/uploads/${req.file.filename}`);

      // Store old photo path to delete after successful update
      if (
        observation.photo_url &&
        observation.photo_url !== "default_photo.png"
      ) {
        oldPhotoPath = path.join(__dirname, "../", observation.photo_url);
      }
    }

    if (updates.length === 0) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(observationId);

    const query = `UPDATE observations SET ${updates.join(
      ", "
    )} WHERE observation_id = ?`;
    db.prepare(query).run(...values);

    // Delete old photo if new one was uploaded or photo was deleted
    if (oldPhotoPath && fs.existsSync(oldPhotoPath)) {
      fs.unlinkSync(oldPhotoPath);
    }

    res.json({ message: "Observation updated successfully" });
  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    console.error("Update observation error:", error);
    res.status(500).json({ error: "Failed to update observation" });
  }
};

// Delete observation - ONLY observation creator can delete
exports.deleteObservation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { observationId } = req.params;

    // Verify ownership - ONLY observation creator can delete
    const observation = db
      .prepare(
        "SELECT user_id, photo_url FROM observations WHERE observation_id = ?"
      )
      .get(observationId);

    if (!observation) {
      return res.status(404).json({ error: "Observation not found" });
    }

    // Check if user is the observation creator (NOT hike owner)
    if (observation.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this observation" });
    }

    // Delete photo file if exists
    if (
      observation.photo_url &&
      observation.photo_url !== "default_photo.png"
    ) {
      const photoPath = path.join(__dirname, "../", observation.photo_url);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    db.prepare("DELETE FROM observations WHERE observation_id = ?").run(
      observationId
    );

    res.json({ message: "Observation deleted successfully" });
  } catch (error) {
    console.error("Delete observation error:", error);
    res.status(500).json({ error: "Failed to delete observation" });
  }
};

// Get all observations by the authenticated user
exports.getMyObservations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const observations = db
      .prepare(
        `SELECT o.*, u.username, u.avatar, u.email, h.name as hike_name, h.location as hike_location
       FROM observations o
       LEFT JOIN users u ON o.user_id = u.user_id
       LEFT JOIN hikes h ON o.hike_id = h.hike_id
       WHERE o.user_id = ?
       ORDER BY o.observation_time DESC`
      )
      .all(userId);

    res.json({
      count: observations.length,
      observations: observations.map((o) => ({
        observationId: o.observation_id,
        hikeId: o.hike_id,
        userId: o.user_id,
        observation: o.observation,
        observationTime: o.observation_time,
        comments: o.comments,
        observationType: o.observation_type,
        photoUrl: o.photo_url,
        latitude: o.latitude,
        longitude: o.longitude,
        username: o.username,
        userAvatar: o.avatar,
        userEmail: o.email,
        hikeName: o.hike_name,
        hikeLocation: o.hike_location,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      })),
    });
  } catch (error) {
    console.error("Get my observations error:", error);
    res.status(500).json({ error: "Failed to fetch observations" });
  }
};
