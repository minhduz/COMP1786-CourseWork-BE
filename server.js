const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Initialize database
require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - IMPORTANT: Order matters!
app.use(cors());
app.use(express.json());

// Parse form-data BEFORE routes
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve uploaded files as static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/hikes", require("./routes/hikes"));
app.use("/api/hikes", require("./routes/observations"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "API is running",
    timestamp: new Date(),
    database: "SQLite",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size exceeds maximum limit" });
    }
    return res.status(400).json({ error: "File upload error" });
  }

  if (err.message && err.message.includes("only image files")) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`M-Hike API server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: SQLite (${process.env.DB_PATH})`);
});

module.exports = app;
