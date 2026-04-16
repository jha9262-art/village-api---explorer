const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is working",
    env: process.env.DATABASE_URL ? "DB_URL_SET" : "DB_URL_MISSING"
  });
});

module.exports = app;
