const db = require("../config/database");

// Get ALL hikes from ALL users (excluding the authenticated user's hikes)
exports.getAllHikes = async (req, res) => {
  try {
    // Get the authenticated user's ID
    const userId = req.user.userId;

    // Optional query parameters for filtering
    const { difficulty, location, limit, offset } = req.query;

    let query = `SELECT h.*, u.username, u.avatar, u.email
                 FROM hikes h
                 LEFT JOIN users u ON h.user_id = u.user_id
                 WHERE h.user_id != ?`;
    const params = [userId];

    // Filter by difficulty if provided
    if (difficulty) {
      query += ` AND h.difficulty_level = ?`;
      params.push(difficulty);
    }

    // Filter by location if provided
    if (location) {
      query += ` AND h.location LIKE ?`;
      params.push(`%${location}%`);
    }

    // Order by most recent first
    query += ` ORDER BY h.created_at DESC`;

    // Add pagination if provided
    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));

      if (offset) {
        query += ` OFFSET ?`;
        params.push(parseInt(offset));
      }
    }

    const hikes = db.prepare(query).all(...params);

    res.json({
      count: hikes.length,
      hikes: hikes.map((h) => ({
        hikeId: h.hike_id,
        userId: h.user_id,
        name: h.name,
        location: h.location,
        hikeDate: h.hike_date,
        parkingAvailable: h.parking_available === 1,
        length: h.length,
        difficultyLevel: h.difficulty_level,
        description: h.description,
        estimatedDuration: h.estimated_duration,
        elevationGain: h.elevation_gain,
        trailType: h.trail_type,
        equipmentNeeded: h.equipment_needed,
        weatherConditions: h.weather_conditions,
        username: h.username,
        userAvatar: h.avatar,
        userEmail: h.email,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      })),
    });
  } catch (error) {
    console.error("Get all hikes error:", error);
    res.status(500).json({ error: "Failed to fetch hikes" });
  }
};

// Create a new hike
exports.createHike = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      location,
      hikeDate,
      parkingAvailable,
      length,
      difficultyLevel,
      description,
      estimatedDuration,
      elevationGain,
      trailType,
      equipmentNeeded,
      weatherConditions,
    } = req.body;

    try {
      const result = db
        .prepare(
          `INSERT INTO hikes (
          user_id, name, location, hike_date, parking_available, length,
          difficulty_level, description, estimated_duration, elevation_gain,
          trail_type, equipment_needed, weather_conditions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          name,
          location,
          hikeDate,
          parkingAvailable ? 1 : 0,
          length,
          difficultyLevel,
          description || null,
          estimatedDuration || null,
          elevationGain || null,
          trailType || null,
          equipmentNeeded || null,
          weatherConditions || null
        );

      const hikeId = result.lastInsertRowid;

      res.status(201).json({
        message: "Hike created successfully",
        hikeId,
        hike: {
          hikeId,
          userId,
          name,
          location,
          hikeDate,
          parkingAvailable,
          length,
          difficultyLevel,
        },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Create hike error:", error);
    res.status(500).json({ error: "Failed to create hike" });
  }
};

// Get all hikes for a user
exports.getUserHikes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const hikes = db
      .prepare(
        `SELECT h.*, u.username, u.avatar, u.email
       FROM hikes h
       LEFT JOIN users u ON h.user_id = u.user_id
       WHERE h.user_id = ?
       ORDER BY h.created_at DESC`
      )
      .all(userId);

    res.json({
      count: hikes.length,
      hikes: hikes.map((h) => ({
        hikeId: h.hike_id,
        userId: h.user_id,
        name: h.name,
        location: h.location,
        hikeDate: h.hike_date,
        parkingAvailable: h.parking_available === 1,
        length: h.length,
        difficultyLevel: h.difficulty_level,
        description: h.description,
        estimatedDuration: h.estimated_duration,
        elevationGain: h.elevation_gain,
        trailType: h.trail_type,
        equipmentNeeded: h.equipment_needed,
        weatherConditions: h.weather_conditions,
        username: h.username,
        userAvatar: h.avatar,
        userEmail: h.email,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      })),
    });
  } catch (error) {
    console.error("Get user hikes error:", error);
    res.status(500).json({ error: "Failed to fetch hikes" });
  }
};

// Get hike by ID
exports.getHikeById = async (req, res) => {
  try {
    const { hikeId } = req.params;

    const hike = db
      .prepare(
        `SELECT h.*, u.username, u.avatar, u.email
       FROM hikes h
       LEFT JOIN users u ON h.user_id = u.user_id
       WHERE h.hike_id = ?`
      )
      .get(hikeId);

    if (!hike) {
      return res.status(404).json({ error: "Hike not found" });
    }

    res.json({
      hikeId: hike.hike_id,
      userId: hike.user_id,
      name: hike.name,
      location: hike.location,
      hikeDate: hike.hike_date,
      parkingAvailable: hike.parking_available === 1,
      length: hike.length,
      difficultyLevel: hike.difficulty_level,
      description: hike.description,
      estimatedDuration: hike.estimated_duration,
      elevationGain: hike.elevation_gain,
      trailType: hike.trail_type,
      equipmentNeeded: hike.equipment_needed,
      weatherConditions: hike.weather_conditions,
      username: hike.username,
      userAvatar: hike.avatar,
      userEmail: hike.email,
      createdAt: hike.created_at,
      updatedAt: hike.updated_at,
    });
  } catch (error) {
    console.error("Get hike by ID error:", error);
    res.status(500).json({ error: "Failed to fetch hike" });
  }
};

// Update hike
exports.updateHike = async (req, res) => {
  try {
    const { hikeId } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const hike = db
      .prepare("SELECT user_id FROM hikes WHERE hike_id = ?")
      .get(hikeId);

    if (!hike) {
      return res.status(404).json({ error: "Hike not found" });
    }

    if (hike.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this hike" });
    }

    // Build update query
    const updates = [];
    const values = [];
    const allowedFields = [
      "name",
      "location",
      "hike_date",
      "parking_available",
      "length",
      "difficulty_level",
      "description",
      "estimated_duration",
      "elevation_gain",
      "trail_type",
      "equipment_needed",
      "weather_conditions",
    ];

    for (const field of allowedFields) {
      const camelCase = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (req.body[camelCase] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === "parking_available") {
          values.push(req.body[camelCase] ? 1 : 0);
        } else {
          values.push(req.body[camelCase]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(hikeId);

    const query = `UPDATE hikes SET ${updates.join(", ")} WHERE hike_id = ?`;
    db.prepare(query).run(...values);

    res.json({ message: "Hike updated successfully" });
  } catch (error) {
    console.error("Update hike error:", error);
    res.status(500).json({ error: "Failed to update hike" });
  }
};

// Delete hike
exports.deleteHike = async (req, res) => {
  try {
    const { hikeId } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const hike = db
      .prepare("SELECT user_id FROM hikes WHERE hike_id = ?")
      .get(hikeId);

    if (!hike) {
      return res.status(404).json({ error: "Hike not found" });
    }

    if (hike.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this hike" });
    }

    db.prepare("DELETE FROM hikes WHERE hike_id = ?").run(hikeId);

    res.json({ message: "Hike deleted successfully" });
  } catch (error) {
    console.error("Delete hike error:", error);
    res.status(500).json({ error: "Failed to delete hike" });
  }
};

// Search hikes by name
exports.searchHikesByName = async (req, res) => {
  try {
    const { name } = req.query;
    const userId = req.user.userId;

    const searchQuery = `%${name}%`;
    const hikes = db
      .prepare(
        `SELECT h.*, u.username, u.avatar, u.email
       FROM hikes h
       LEFT JOIN users u ON h.user_id = u.user_id
       WHERE h.user_id = ? AND h.name LIKE ?
       ORDER BY h.name`
      )
      .all(userId, searchQuery);

    res.json({
      count: hikes.length,
      hikes: hikes.map((h) => ({
        hikeId: h.hike_id,
        userId: h.user_id,
        name: h.name,
        location: h.location,
        hikeDate: h.hike_date,
        parkingAvailable: h.parking_available === 1,
        length: h.length,
        difficultyLevel: h.difficulty_level,
        username: h.username,
        userAvatar: h.avatar,
      })),
    });
  } catch (error) {
    console.error("Search hikes by name error:", error);
    res.status(500).json({ error: "Failed to search hikes" });
  }
};

// Advanced search hikes
exports.advancedSearchHikes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, location, length, date } = req.query;

    let query = `SELECT h.*, u.username, u.avatar, u.email
                 FROM hikes h
                 LEFT JOIN users u ON h.user_id = u.user_id
                 WHERE h.user_id = ?`;
    const params = [userId];

    if (name) {
      query += ` AND h.name LIKE ?`;
      params.push(`%${name}%`);
    }

    if (location) {
      query += ` AND h.location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (length) {
      query += ` AND h.length = ?`;
      params.push(parseFloat(length));
    }

    if (date) {
      query += ` AND h.hike_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY h.created_at DESC`;

    const hikes = db.prepare(query).all(...params);

    res.json({
      count: hikes.length,
      hikes: hikes.map((h) => ({
        hikeId: h.hike_id,
        userId: h.user_id,
        name: h.name,
        location: h.location,
        hikeDate: h.hike_date,
        parkingAvailable: h.parking_available === 1,
        length: h.length,
        difficultyLevel: h.difficulty_level,
        description: h.description,
        username: h.username,
        userAvatar: h.avatar,
      })),
    });
  } catch (error) {
    console.error("Advanced search hikes error:", error);
    res.status(500).json({ error: "Failed to search hikes" });
  }
};

// Search ALL hikes by name (from all users, excluding current user's hikes)
exports.searchAllHikesByName = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.query;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchQuery = `%${name}%`;
    const hikes = db
      .prepare(
        `SELECT h.*, u.username, u.avatar, u.email
       FROM hikes h
       LEFT JOIN users u ON h.user_id = u.user_id
       WHERE h.user_id != ? AND h.name LIKE ?
       ORDER BY h.created_at DESC`
      )
      .all(userId, searchQuery);

    res.json({
      count: hikes.length,
      hikes: hikes.map((h) => ({
        hikeId: h.hike_id,
        userId: h.user_id,
        name: h.name,
        location: h.location,
        hikeDate: h.hike_date,
        parkingAvailable: h.parking_available === 1,
        length: h.length,
        difficultyLevel: h.difficulty_level,
        description: h.description,
        estimatedDuration: h.estimated_duration,
        elevationGain: h.elevation_gain,
        trailType: h.trail_type,
        equipmentNeeded: h.equipment_needed,
        weatherConditions: h.weather_conditions,
        username: h.username,
        userAvatar: h.avatar,
        userEmail: h.email,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      })),
    });
  } catch (error) {
    console.error("Search all hikes by name error:", error);
    res.status(500).json({ error: "Failed to search hikes" });
  }
};
