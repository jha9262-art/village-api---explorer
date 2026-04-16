const express = require("express");
const cors = require("cors");

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

// Mock geographical data API endpoints
app.get("/states", (req, res) => {
  const mockStates = [
    { id: 1, state_name: "Andhra Pradesh", code: "AP" },
    { id: 2, state_name: "Arunachal Pradesh", code: "AR" },
    { id: 3, state_name: "Assam", code: "AS" },
    { id: 4, state_name: "Bihar", code: "BR" },
    { id: 5, state_name: "Gujarat", code: "GJ" },
    { id: 6, state_name: "Karnataka", code: "KA" },
    { id: 7, state_name: "Kerala", code: "KL" },
    { id: 8, state_name: "Madhya Pradesh", code: "MP" },
    { id: 9, state_name: "Maharashtra", code: "MH" },
    { id: 10, state_name: "Rajasthan", code: "RJ" },
    { id: 11, state_name: "Tamil Nadu", code: "TN" },
    { id: 12, state_name: "Uttar Pradesh", code: "UP" },
    { id: 13, state_name: "West Bengal", code: "WB" }
  ];
  
  res.json({
    success: true,
    data: mockStates,
    count: mockStates.length
  });
});

app.get("/states/:stateId/districts", (req, res) => {
  const stateId = parseInt(req.params.stateId);
  const mockDistricts = [
    { id: 1, state_id: stateId, district_name: "Central District", code: "CTR" },
    { id: 2, state_id: stateId, district_name: "North District", code: "NTH" },
    { id: 3, state_id: stateId, district_name: "South District", code: "STH" },
    { id: 4, state_id: stateId, district_name: "East District", code: "EST" },
    { id: 5, state_id: stateId, district_name: "West District", code: "WST" }
  ];
  
  res.json({
    success: true,
    data: mockDistricts,
    count: mockDistricts.length
  });
});

app.get("/districts/:districtId/subdistricts", (req, res) => {
  const districtId = parseInt(req.params.districtId);
  const mockSubdistricts = [
    { id: 1, district_id: districtId, subdistrict_name: "Central Subdistrict", code: "CSD" },
    { id: 2, district_id: districtId, subdistrict_name: "North Subdistrict", code: "NSD" },
    { id: 3, district_id: districtId, subdistrict_name: "South Subdistrict", code: "SSD" }
  ];
  
  res.json({
    success: true,
    data: mockSubdistricts,
    count: mockSubdistricts.length
  });
});

app.get("/subdistricts/:subdistrictId/villages", (req, res) => {
  const subdistrictId = parseInt(req.params.subdistrictId);
  const mockVillages = [
    { id: 1, subdistrict_id: subdistrictId, village_name: "Central Village", code: "CVL" },
    { id: 2, subdistrict_id: subdistrictId, village_name: "North Village", code: "NVL" },
    { id: 3, subdistrict_id: subdistrictId, village_name: "South Village", code: "SVL" },
    { id: 4, subdistrict_id: subdistrictId, village_name: "East Village", code: "EVL" },
    { id: 5, subdistrict_id: subdistrictId, village_name: "West Village", code: "WVL" }
  ];
  
  res.json({
    success: true,
    data: mockVillages,
    count: mockVillages.length
  });
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