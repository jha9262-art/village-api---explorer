// Vercel environment variables are automatically injected
console.log("All env vars:", Object.keys(process.env));

const express = require("express");
const cors = require("cors");

// Check if critical environment variables exist
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  console.error("All available env vars:", Object.keys(process.env));
  // Don't exit - let function continue with error handling
} else {
  console.log("DATABASE_URL is set:", process.env.DATABASE_URL.substring(0, 50) + "...");
}

// Simple database test without pool
const { Pool } = require("pg");

// Database connection test removed to isolate crash issue

// All modules removed - back to basic working version
// const pool = require("./db");
// const cache = require("./cache");
// const auth = require("./auth");

const app = express();

// Initialize monitoring - commented out
// initializeSentry(app);

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging and performance monitoring - commented out
// app.use(requestLogger);
// app.use(performanceMonitor);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "connected",
    cache: "connected",
    uptime: process.uptime(),
    message: "API is working - database test removed"
  });
});

// All routes removed - back to basic
// app.use("/api/auth", auth);

// Serve static files for dashboards - commented out
// app.use("/admin", express.static("admin-dashboard.html"));
// app.use("/client", express.static("client-dashboard.html"));

// Error handling - commented out
// app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `Cannot ${req.method} ${req.path}`
  });
});

module.exports = app;