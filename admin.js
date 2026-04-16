const pool = require('./db');

// Get all users (admin only)
async function getAllUsers(filters = {}) {
  try {
    let query = `
      SELECT 
        id, email, full_name, company_name, role, subscription_tier, 
        status, created_at, last_login, phone, country
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(filters.role);
    }

    if (filters.tier) {
      query += ` AND subscription_tier = $${params.length + 1}`;
      params.push(filters.tier);
    }

    if (filters.search) {
      query += ` AND (email ILIKE $${params.length + 1} OR full_name ILIKE $${params.length + 1} OR company_name ILIKE $${params.length + 1})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    return { success: true, users: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user details
async function getUserDetails(userId) {
  try {
    const userResult = await pool.query(
      `SELECT id, email, full_name, company_name, role, subscription_tier, 
              status, created_at, last_login, phone, country
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const user = userResult.rows[0];

    // Get API keys
    const keysResult = await pool.query(
      `SELECT id, name, is_active, created_at, last_used FROM api_keys WHERE user_id = $1`,
      [userId]
    );

    // Get usage stats
    const usageResult = await pool.query(
      `SELECT COUNT(*) as total_requests, AVG(response_time_ms) as avg_response_time,
              MAX(response_time_ms) as max_response_time, 
              COUNT(DISTINCT DATE(created_at)) as days_active
       FROM api_usage_logs 
       WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)`,
      [userId]
    );

    // Get billing info
    const billingResult = await pool.query(
      `SELECT period_start, period_end, api_calls_used, amount_due, status 
       FROM billing WHERE user_id = $1 ORDER BY period_start DESC LIMIT 12`,
      [userId]
    );

    return {
      success: true,
      user,
      apiKeys: keysResult.rows,
      usage: usageResult.rows[0],
      billingHistory: billingResult.rows,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Approve user account
async function approveUser(userId, adminId) {
  try {
    const result = await pool.query(
      `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING id, email, full_name, status`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Log admin action
    await pool.query(
      `INSERT INTO audit_log (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'approve_user', 'user', userId, JSON.stringify({ status: 'active' })]
    );

    return { success: true, user: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Suspend user account
async function suspendUser(userId, reason, adminId) {
  try {
    const result = await pool.query(
      `UPDATE users SET status = 'suspended', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING id, email, full_name, status`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Log admin action
    await pool.query(
      `INSERT INTO audit_log (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'suspend_user', 'user', userId, JSON.stringify({ reason })]
    );

    return { success: true, user: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update subscription tier
async function updateSubscriptionTier(userId, newTier, adminId) {
  try {
    const validTiers = ['free', 'premium', 'pro', 'unlimited'];
    if (!validTiers.includes(newTier)) {
      return { success: false, error: 'Invalid subscription tier' };
    }

    const result = await pool.query(
      `UPDATE users SET subscription_tier = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING id, email, subscription_tier`,
      [newTier, userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Log admin action
    await pool.query(
      `INSERT INTO audit_log (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'update_tier', 'user', userId, JSON.stringify({ newTier })]
    );

    return { success: true, user: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get analytics dashboard data
async function getAnalyticsDashboard() {
  try {
    // Total users by status
    const userStatsResult = await pool.query(`
      SELECT status, COUNT(*) as count FROM users GROUP BY status
    `);

    // Total users by tier
    const tierStatsResult = await pool.query(`
      SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier
    `);

    // API usage stats
    const usageStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT api_key_id) as active_api_keys,
        AVG(response_time_ms) as avg_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests
      FROM api_usage_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    // Revenue stats
    const revenueResult = await pool.query(`
      SELECT 
        SUM(amount_due) as total_revenue,
        COUNT(DISTINCT user_id) as paying_users,
        AVG(amount_due) as avg_invoice
      FROM billing
      WHERE status = 'paid' AND period_start > NOW() - INTERVAL '30 days'
    `);

    // Daily API calls trend (last 7 days)
    const trendResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as api_calls
      FROM api_usage_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Top endpoints
    const topEndpointsResult = await pool.query(`
      SELECT 
        endpoint,
        COUNT(*) as call_count,
        AVG(response_time_ms) as avg_response_time
      FROM api_usage_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY endpoint
      ORDER BY call_count DESC
      LIMIT 10
    `);

    // Pending approvals
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE status = 'pending'
    `);

    return {
      success: true,
      userStats: userStatsResult.rows,
      tierStats: tierStatsResult.rows,
      usageStats: usageStatsResult.rows[0],
      revenueStats: revenueResult.rows[0],
      dailyTrend: trendResult.rows,
      topEndpoints: topEndpointsResult.rows,
      pendingApprovals: pendingResult.rows[0].count,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get audit log
async function getAuditLog(limit = 100, offset = 0) {
  try {
    const result = await pool.query(`
      SELECT 
        al.id, al.action, al.entity_type, al.entity_id, al.changes, al.created_at,
        u.email as admin_email
      FROM audit_log al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return { success: true, logs: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAllUsers,
  getUserDetails,
  approveUser,
  suspendUser,
  updateSubscriptionTier,
  getAnalyticsDashboard,
  getAuditLog,
};
