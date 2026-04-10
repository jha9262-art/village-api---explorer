const { verifyJWT, verifyAPIKey, logAPIUsage } = require('./auth');
const { rateLimitMiddleware } = require('./rate-limit');

// JWT Middleware - for authenticated users (admins, portal access)
const authJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    
    req.user = decoded;
    req.tier = decoded.subscription_tier; // For rate limiting
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
};

// API Key Middleware - for API clients
const authAPIKey = async (req, res, next) => {
  try {
    const key = req.headers['x-api-key'];
    const secret = req.headers['x-api-secret'];
    
    if (!key || !secret) {
      return res.status(401).json({ success: false, error: 'Missing API credentials' });
    }
    
    const startTime = Date.now();
    const result = await verifyAPIKey(key, secret);
    
    if (!result.success) {
      return res.status(401).json({ success: false, error: result.error });
    }
    
    req.apiKey = result;
    req.apiKeyId = result.apiKeyId; // For rate limiting
    req.tier = result.subscriptionTier; // For rate limiting
    req.startTime = startTime;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
};

// Usage Tracking Middleware
const trackUsage = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function (data) {
    if (req.apiKey) {
      const responseTime = Date.now() - req.startTime;
      logAPIUsage(
        req.apiKey.apiKeyId,
        req.path,
        req.method,
        res.statusCode,
        responseTime
      ).catch(err => console.error('Usage tracking error:', err));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Subscription tier check
const requireTier = (requiredTier) => {
  const tierHierarchy = { free: 0, premium: 1, pro: 2, unlimited: 3 };
  
  return (req, res, next) => {
    if (!req.apiKey && !req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const userTier = req.apiKey?.subscriptionTier || req.user?.subscription_tier;
    
    if (tierHierarchy[userTier] < tierHierarchy[requiredTier]) {
      return res.status(403).json({
        success: false,
        error: `This feature requires ${requiredTier} subscription or higher`,
      });
    }
    
    next();
  };
};

module.exports = {
  authJWT,
  authAPIKey,
  trackUsage,
  requireRole,
  requireTier,
  rateLimitMiddleware
};
