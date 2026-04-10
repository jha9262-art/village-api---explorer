require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const auth = require("./auth");
const admin = require("./admin");
const cache = require("./cache");
const { authJWT, authAPIKey, trackUsage, requireRole, requireTier, rateLimitMiddleware } = require("./middleware");
const {
  initializeSentry,
  errorHandler,
  requestLogger,
  performanceMonitor,
  logger,
  updateHealthData,
  getHealthStatus,
  setupUnhandledErrorHandlers,
} = require("./monitoring");

const app = express();

// ==================== MONITORING & ERROR TRACKING ====================
initializeSentry(app);
setupUnhandledErrorHandlers();

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

app.use(requestLogger); // Log all requests
app.use(performanceMonitor); // Monitor response times
app.use(cors());
app.use(express.json());
app.use(trackUsage); // Track all API usage
app.use(rateLimitMiddleware); // Apply rate limiting

// Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "Village API is running with authentication" });
});

// Detailed health check (production)
app.get("/health", (req, res) => {
  const health = getHealthStatus();
  const statusCode = health.status === "operational" ? 200 : 503;
  res.status(statusCode).json(health);
});

// ==================== AUTHENTICATION ENDPOINTS ====================

// Register new user
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, fullName, companyName } = req.body;
    
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    
    const result = await auth.registerUser(email, password, fullName, companyName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json({
      success: true,
      message: "Registration successful. Please wait for admin approval.",
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login user
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }
    
    const result = await auth.loginUser(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create API Key (requires JWT auth)
app.post("/auth/api-keys", authJWT, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: "Key name required" });
    }
    
    const result = await auth.createAPIKey(req.user.id, name);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List user API keys (requires JWT auth)
app.get("/auth/api-keys", authJWT, async (req, res) => {
  try {
    const result = await auth.getUserAPIKeys(req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disable API Key (requires JWT auth)
app.delete("/auth/api-keys/:id", authJWT, async (req, res) => {
  try {
    const result = await auth.disableAPIKey(parseInt(req.params.id), req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({ success: true, message: "API key disabled" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify token (requires JWT auth)
app.get("/auth/verify", authJWT, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// ==================== DATA ENDPOINTS ====================

app.get("/states", async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const cacheKey = `states:${limit}:${offset}`;

    // Try cache first
    let result = await cache.getCached(cacheKey);
    
    if (!result) {
      // Query database if not in cache
      result = await pool.query(`
        SELECT DISTINCT ON (state_name)
          id,
          state_code,
          state_name
        FROM state
        ORDER BY state_name, id
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      // Cache for 1 hour
      await cache.setCached(cacheKey, result.rows, 3600);
      result = result.rows;
    }
    
    res.json({
      success: true,
      count: result.length,
      limit,
      offset,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/states/:id/districts", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const cacheKey = `districts:state:${id}:${limit}:${offset}`;

    // Try cache first
    let result = await cache.getCached(cacheKey);
    
    if (!result) {
      // Query database if not in cache
      const queryResult = await pool.query(
        "SELECT id, district_code, district_name FROM district WHERE state_id = $1 ORDER BY district_name LIMIT $2 OFFSET $3",
        [id, limit, offset]
      );
      result = queryResult.rows;
      
      // Cache for 1 hour
      await cache.setCached(cacheKey, result, 3600);
    }
    
    res.json({
      success: true,
      count: result.length,
      limit,
      offset,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/districts/:id/subdistricts", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const cacheKey = `subdistricts:district:${id}:${limit}:${offset}`;

    // Try cache first
    let result = await cache.getCached(cacheKey);
    
    if (!result) {
      // Query database if not in cache
      const queryResult = await pool.query(
        "SELECT id, subdistrict_code, subdistrict_name FROM subdistrict WHERE district_id = $1 ORDER BY subdistrict_name LIMIT $2 OFFSET $3",
        [id, limit, offset]
      );
      result = queryResult.rows;
      
      // Cache for 1 hour
      await cache.setCached(cacheKey, result, 3600);
    }
    
    res.json({
      success: true,
      count: result.length,
      limit,
      offset,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/subdistricts/:id/villages", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const cacheKey = `villages:subdistrict:${id}:${limit}:${offset}`;

    // Try cache first
    let result = await cache.getCached(cacheKey);
    
    if (!result) {
      // Query database if not in cache
      const queryResult = await pool.query(
        "SELECT id, village_code, village_name FROM village WHERE subdistrict_id = $1 ORDER BY village_name LIMIT $2 OFFSET $3",
        [id, limit, offset]
      );
      result = queryResult.rows;
      
      // Cache for 1 hour
      await cache.setCached(cacheKey, result, 3600);
    }
    
    res.json({
      success: true,
      count: result.length,
      limit,
      offset,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query must be at least 2 characters",
      });
    }

    const cacheKey = `search:${q.trim()}:${limit}:${offset}`;
    
    // Try cache first
    let formatted = await cache.getCached(cacheKey);
    
    if (!formatted) {
      // Query database if not in cache
      const searchTerm = `%${q.trim()}%`;
      const result = await pool.query(
        `
        SELECT 
          v.id,
          v.village_code,
          v.village_name,
          sd.subdistrict_name,
          d.district_name,
          s.state_name,
          c.name AS country_name,
          CONCAT(
            v.village_name, ', ',
            sd.subdistrict_name, ', ',
            d.district_name, ', ',
            s.state_name, ', ',
            c.name
          ) AS full_address
        FROM village v
        JOIN subdistrict sd ON v.subdistrict_id = sd.id
        JOIN district d ON sd.district_id = d.id
        JOIN state s ON d.state_id = s.id
        JOIN country c ON s.country_id = c.id
        WHERE v.village_name ILIKE $1
          OR sd.subdistrict_name ILIKE $1
          OR d.district_name ILIKE $1
          OR s.state_name ILIKE $1
          OR c.name ILIKE $1
        ORDER BY v.village_name
        LIMIT $2 OFFSET $3
        `,
        [searchTerm, limit, offset]
      );

      formatted = result.rows.map((row) => ({
        value: row.village_code,
        label: row.village_name,
        fullAddress: row.full_address,
        hierarchy: {
          village: row.village_name,
          subDistrict: row.subdistrict_name,
          district: row.district_name,
          state: row.state_name,
          country: row.country_name,
        },
      }));
      
      // Cache for 30 minutes (searches are more volatile)
      await cache.setCached(cacheKey, formatted, 1800);
    }

    res.json({
      success: true,
      count: formatted.length,
      limit,
      offset,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all users (admin only)
app.get("/admin/users", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      role: req.query.role,
      tier: req.query.tier,
      search: req.query.search,
    };
    
    const result = await admin.getAllUsers(filters);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user details (admin only)
app.get("/admin/users/:id", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await admin.getUserDetails(parseInt(req.params.id));
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve user (admin only)
app.post("/admin/users/:id/approve", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await admin.approveUser(parseInt(req.params.id), req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({ success: true, message: "User approved", user: result.user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Suspend user (admin only)
app.post("/admin/users/:id/suspend", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await admin.suspendUser(parseInt(req.params.id), reason, req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({ success: true, message: "User suspended", user: result.user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update subscription tier (admin only)
app.post("/admin/users/:id/tier", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const { tier } = req.body;
    
    if (!tier) {
      return res.status(400).json({ success: false, error: "Tier required" });
    }
    
    const result = await admin.updateSubscriptionTier(parseInt(req.params.id), tier, req.user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({ success: true, message: "Subscription tier updated", user: result.user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get analytics dashboard (admin only)
app.get("/admin/analytics", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await admin.getAnalyticsDashboard();
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get audit log (admin only)
app.get("/admin/audit-log", authJWT, requireRole(["admin"]), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await admin.getAuditLog(limit, offset);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CLIENT ENDPOINTS ====================

// Get client profile and subscription info
app.get("/client/profile", authJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userResult = await pool.query(
      `SELECT id, email, full_name, company_name, subscription_tier, status, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const user = userResult.rows[0];
    
    // Get API keys count
    const keysResult = await pool.query(
      `SELECT COUNT(*) as count FROM api_keys WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    
    // Get current month usage
    const usageResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(AVG(response_time_ms), 0) as avg_response_time
       FROM api_usage_logs 
       WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)
       AND created_at >= DATE_TRUNC('month', NOW())`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        ...user,
        api_keys_count: parseInt(keysResult.rows[0].count),
        monthly_calls: parseInt(usageResult.rows[0].count),
        avg_response_time: parseFloat(usageResult.rows[0].avg_response_time)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get client usage statistics
app.get("/client/usage", authJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    // Get daily usage data
    const dailyUsage = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as calls, AVG(response_time_ms) as avg_response_time
       FROM api_usage_logs 
       WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)
       AND created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) DESC`,
      [userId, days]
    );
    
    // Get endpoint breakdown
    const endpointStats = await pool.query(
      `SELECT endpoint, COUNT(*) as calls, AVG(response_time_ms) as avg_response_time,
              SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
       FROM api_usage_logs 
       WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)
       AND created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY endpoint
       ORDER BY calls DESC`,
      [userId, days]
    );
    
    // Get current month total
    const monthTotal = await pool.query(
      `SELECT COUNT(*) as total_calls, MIN(response_time_ms) as min_response, 
              MAX(response_time_ms) as max_response, AVG(response_time_ms) as avg_response
       FROM api_usage_logs 
       WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)
       AND created_at >= DATE_TRUNC('month', NOW())`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        daily_usage: dailyUsage.rows,
        endpoint_stats: endpointStats.rows,
        month_summary: {
          total_calls: parseInt(monthTotal.rows[0].total_calls),
          min_response_ms: parseInt(monthTotal.rows[0].min_response),
          max_response_ms: parseInt(monthTotal.rows[0].max_response),
          avg_response_ms: parseFloat(monthTotal.rows[0].avg_response)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get client billing information
app.get("/client/billing", authJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get billing records
    const billingResult = await pool.query(
      `SELECT * FROM billing WHERE user_id = $1 ORDER BY period_start DESC LIMIT 12`,
      [userId]
    );
    
    // Get subscription plan info
    const userResult = await pool.query(
      `SELECT subscription_tier FROM users WHERE id = $1`,
      [userId]
    );
    
    const planResult = await pool.query(
      `SELECT * FROM subscription_plans WHERE name = $1`,
      [userResult.rows[0].subscription_tier]
    );
    
    res.json({
      success: true,
      data: {
        current_plan: planResult.rows[0] || null,
        billing_history: billingResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Request tier upgrade
app.post("/client/upgrade-request", authJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestedTier } = req.body;
    
    if (!requestedTier) {
      return res.status(400).json({ success: false, message: "Requested tier is required" });
    }
    
    // Validate tier exists
    const tierResult = await pool.query(
      `SELECT * FROM subscription_plans WHERE name = $1`,
      [requestedTier]
    );
    
    if (tierResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid subscription tier" });
    }
    
    // Log upgrade request to audit log
    await pool.query(
      `INSERT INTO audit_log (admin_id, action, entity_type, entity_id, changes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, 'upgrade_request', 'user', userId, JSON.stringify({ requested_tier: requestedTier })]
    );
    
    res.json({
      success: true,
      message: `Upgrade request to ${requestedTier} submitted. Admin will review shortly.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;

// Test database connection
pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    logger.error("Database connection failed:", err);
    updateHealthData("databaseConnected", false);
  } else {
    logger.info("✅ Database: Connected to village_api");
    updateHealthData("databaseConnected", true);
  }
});

// Test cache connection
cache.initializeCache?.().then(() => {
  logger.info("✅ Cache: Connected");
  updateHealthData("cacheConnected", true);
});

// Initialize logs directory for Winston
const fs = require("fs");
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════════════════╗
║    🇮🇳 Indian Villages SaaS API (Admin + Client Portal)   ║
║                  Phase 5: PRODUCTION READY                 ║
╚════════════════════════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}

🎯 Admin Panel:
   📍 URL: http://localhost:${PORT}/admin-login.html
   📧 Email: admin@example.com
   🔑 Password: AdminPass123!

👤 B2B Client Portal:
   📍 URL: http://localhost:${PORT}/client-login.html
   📧 Demo: demo@client.com
   🔑 Password: Demo123!

🔐 Authentication Endpoints:
   POST   /auth/register          - Register new user
   POST   /auth/login             - Login & get JWT token
   POST   /auth/api-keys          - Create API key
   GET    /auth/api-keys          - List your API keys
   DELETE /auth/api-keys/:id      - Disable API key
   GET    /auth/verify            - Verify JWT token

👥 Admin Endpoints (Admin Only):
   GET    /admin/users            - List all users
   GET    /admin/users/:id        - Get user details
   POST   /admin/users/:id/approve - Approve user
   POST   /admin/users/:id/suspend - Suspend user
   POST   /admin/users/:id/tier   - Update subscription tier
   GET    /admin/analytics        - Dashboard analytics
   GET    /admin/audit-log        - Admin audit log

💼 Client Endpoints (Authenticated):
   GET    /client/profile         - Get client profile
   GET    /client/usage           - Usage statistics
   GET    /client/billing         - Billing information
   POST   /client/upgrade-request - Request tier upgrade

📊 Data Endpoints (Public):
   GET    /states                 - Browse all states
   GET    /states/:id/districts   - Get districts by state
   GET    /districts/:id/subdistricts - Get subdistricts
   GET    /subdistricts/:id/villages  - Get villages
   GET    /search                 - Search villages

⚡ Performance & Monitoring:
   GET    /health                 - Health check endpoint
   📊 Sentry APM: ${process.env.SENTRY_DSN ? "✅ Enabled" : "⚠️  Disabled"}
   📝 Logging: Winston logger active
   ✅ Rate Limiting: ${process.env.NODE_ENV === "production" ? "ENFORCED" : "Active"}
   💾 Caching: Redis (with in-memory fallback)
  `);
});

// ==================== ERROR HANDLER ====================
// MUST be last middleware
app.use(errorHandler);