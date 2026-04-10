const cache = require('./cache');

/**
 * Tier-based rate limit configuration
 * Defines requests per minute for each subscription tier
 */
const RATE_LIMITS = {
  free: 10,        // 10 requests/min
  premium: 100,    // 100 requests/min
  pro: 300,        // 300 requests/min
  unlimited: 99999 // No practical limit
};

/**
 * Get rate limit for a subscription tier
 */
function getLimitForTier(tier) {
  return RATE_LIMITS[tier] || RATE_LIMITS.free;
}

/**
 * Rate limiting middleware - checks req.user.subscription_tier or API key limits
 * Uses API key ID or user ID for tracking
 */
async function rateLimitMiddleware(req, res, next) {
  try {
    // Get identifier (API key ID or user ID)
    const identifier = req.apiKeyId || req.user?.id;
    const tier = req.tier || req.user?.subscription_tier || 'free';
    
    if (!identifier) {
      // Skip rate limiting for unauthenticated users (public endpoints)
      return next();
    }

    const limit = getLimitForTier(tier);
    const windowKey = `ratelimit:${identifier}:${Math.floor(Date.now() / 60000)}`;
    
    // Increment counter
    const count = await cache.incrementCounter(windowKey, 60); // 60 second TTL
    
    if (count === null) {
      // Cache unavailable, allow request (fail open)
      console.warn('⚠️  Rate limiting unavailable, allowing request');
      return next();
    }

    // Set rate limit headers
    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', Math.max(0, limit - count));
    res.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 60);

    console.log(`📊 Rate: ${count}/${limit} for ${tier} (${identifier})`);

    // Check if limit exceeded
    if (count > limit) {
      console.warn(`🚫 Rate limit exceeded for ${identifier} (${count}/${limit})`);
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Limit: ${limit} requests/minute for ${tier} tier`,
        retryAfter: 60,
        currentUsage: count,
        limit: limit
      });
    }

    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error.message);
    next(); // Continue on error
  }
}

/**
 * Get rate limit stats for a user/API key
 */
async function getRateLimitStats(identifier) {
  try {
    const now = Math.floor(Date.now() / 60000);
    const currentWindow = `ratelimit:${identifier}:${now}`;
    const count = await cache.getCounter(currentWindow);
    
    return {
      current_requests: count || 0,
      window_start: new Date((now) * 60000),
      window_end: new Date((now + 1) * 60000),
      seconds_remaining: 60 - (Math.floor((Date.now() % 60000) / 1000))
    };
  } catch (error) {
    console.error('Error getting rate limit stats:', error.message);
    return null;
  }
}

/**
 * Reset rate limit for a user/API key (admin operation)
 */
async function resetRateLimit(identifier) {
  try {
    const now = Math.floor(Date.now() / 60000);
    
    // Delete current and previous windows
    await cache.deleteCached(`ratelimit:${identifier}:${now}`);
    await cache.deleteCached(`ratelimit:${identifier}:${now - 1}`);
    
    console.log(`✅ Rate limit reset for ${identifier}`);
    return true;
  } catch (error) {
    console.error('Error resetting rate limit:', error.message);
    return false;
  }
}

module.exports = {
  rateLimitMiddleware,
  getLimitForTier,
  getRateLimitStats,
  resetRateLimit,
  RATE_LIMITS
};
