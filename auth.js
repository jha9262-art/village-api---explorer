const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '7d';
const API_KEY_LENGTH = 32;
const API_SECRET_LENGTH = 64;

// Generate JWT Token
function generateJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription_tier: user.subscription_tier,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
}

// Generate API Key and Secret (only shown once)
function generateAPIKeyPair() {
  const key = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
  const secret = crypto.randomBytes(API_SECRET_LENGTH).toString('hex');
  
  return {
    key,
    secret,
    keyHash: hashString(key),
    secretHash: hashString(secret),
  };
}

// Hash function for secure storage
function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Verify JWT Token
function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Hash password with bcrypt
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Compare password with hash
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Register new user
async function registerUser(email, password, fullName, companyName) {
  try {
    const passwordHash = await hashPassword(password);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, company_name, role, status) 
       VALUES ($1, $2, $3, $4, 'client', 'pending') 
       RETURNING id, email, full_name`,
      [email, passwordHash, fullName, companyName]
    );
    
    return { success: true, user: result.rows[0] };
  } catch (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Email already exists' };
    }
    return { success: false, error: error.message };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, subscription_tier, status 
       FROM users WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const user = result.rows[0];
    
    if (user.status !== 'active') {
      return { success: false, error: `Account is ${user.status}` };
    }
    
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return { success: false, error: 'Invalid password' };
    }
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    const token = generateJWT(user);
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        subscriptionTier: user.subscription_tier,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create API Key for user
async function createAPIKey(userId, keyName) {
  try {
    const keyPair = generateAPIKeyPair();
    
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, key_hash, key_secret_hash, name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, created_at`,
      [userId, keyPair.keyHash, keyPair.secretHash, keyName]
    );
    
    // Return the key and secret only once
    return {
      success: true,
      apiKey: result.rows[0],
      // These are only shown once to the user
      key: keyPair.key,
      secret: keyPair.secret,
      message: 'Save this key and secret securely. They will not be shown again.',
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Verify API Key and Secret
async function verifyAPIKey(key, secret) {
  try {
    const keyHash = hashString(key);
    const secretHash = hashString(secret);
    
    const result = await pool.query(
      `SELECT ak.id, ak.user_id, ak.is_active, u.subscription_tier, u.status
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND ak.key_secret_hash = $2`,
      [keyHash, secretHash]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid API credentials' };
    }
    
    const apiKey = result.rows[0];
    
    if (!apiKey.is_active) {
      return { success: false, error: 'API key is disabled' };
    }
    
    if (apiKey.status !== 'active') {
      return { success: false, error: 'User account is not active' };
    }
    
    // Update last used
    await pool.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKey.id]
    );
    
    return {
      success: true,
      apiKeyId: apiKey.id,
      userId: apiKey.user_id,
      subscriptionTier: apiKey.subscription_tier,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user API keys
async function getUserAPIKeys(userId) {
  try {
    const result = await pool.query(
      `SELECT id, name, key_hash, is_active, rate_limit, created_at, last_used, expires_at
       FROM api_keys 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return { success: true, apiKeys: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Disable API Key
async function disableAPIKey(keyId, userId) {
  try {
    const result = await pool.query(
      `UPDATE api_keys 
       SET is_active = false 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, name`,
      [keyId, userId]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'API key not found' };
    }
    
    return { success: true, apiKey: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Log API usage
async function logAPIUsage(apiKeyId, endpoint, method, statusCode, responseTime) {
  try {
    await pool.query(
      `INSERT INTO api_usage_logs (api_key_id, endpoint, method, status_code, response_time_ms) 
       VALUES ($1, $2, $3, $4, $5)`,
      [apiKeyId, endpoint, method, statusCode, responseTime]
    );
  } catch (error) {
    console.error('Failed to log API usage:', error.message);
  }
}

module.exports = {
  generateJWT,
  generateAPIKeyPair,
  verifyJWT,
  hashPassword,
  verifyPassword,
  registerUser,
  loginUser,
  createAPIKey,
  verifyAPIKey,
  getUserAPIKeys,
  disableAPIKey,
  logAPIUsage,
  hashString,
};
