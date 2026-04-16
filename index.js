const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Basic middleware with better CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "API is working"
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Village API Backend",
    status: "running",
    endpoints: ["/health", "/states", "/districts", "/subdistricts", "/villages"]
  });
});

// Geographical data API endpoints
app.get("/states", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT id, state_code as code, state_name
      FROM state
      ORDER BY state_name
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

app.get("/states/:stateId/districts", async (req, res) => {
  try {
    const stateId = parseInt(req.params.stateId);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT id, district_code as code, district_name
      FROM district
      WHERE state_id = $1
      ORDER BY district_name
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [stateId, limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

app.get("/districts/:districtId/subdistricts", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT id, subdistrict_code as code, subdistrict_name
      FROM subdistrict
      WHERE district_id = $1
      ORDER BY subdistrict_name
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [districtId, limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching subdistricts:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

app.get("/subdistricts/:subdistrictId/villages", async (req, res) => {
  try {
    const subdistrictId = parseInt(req.params.subdistrictId);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT id, village_code as code, village_name
      FROM village
      WHERE subdistrict_id = $1
      ORDER BY village_name
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [subdistrictId, limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching villages:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Start server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Village API Backend running on port ${port}`);
  });
}

module.exports = app;