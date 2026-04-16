const redis = require('redis');

let client = null;
let useInMemory = false;

// In-memory store fallback
const memoryStore = new Map();

// Try to connect to Redis, but fall back to in-memory store
async function initializeCache() {
  try {
    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
      legacyMode: true,
      connectTimeout: 2000,
      reconnectStrategy: () => null // Don't retry
    });

    client.on('error', (err) => {
      console.warn('⚠️  Redis unavailable - using in-memory cache');
      useInMemory = true;
      client = null;
    });

    client.on('connect', () => {
      console.log('✅ Redis cache connected');
      useInMemory = false;
    });

    await client.connect();
  } catch (error) {
    console.warn('⚠️  Redis unavailable - using in-memory cache');
    useInMemory = true;
    client = null;
  }
}

// Initialize cache on module load
initializeCache().catch(() => {
  useInMemory = true;
});

/**
 * Get value from cache
 */
async function getCached(key) {
  try {
    if (useInMemory || !client) {
      const cached = memoryStore.get(key);
      if (cached && cached.expires > Date.now()) {
        console.log(`📦 Cache HIT: ${key} (memory)`);
        return cached.value;
      }
      if (cached) {
        memoryStore.delete(key);
      }
      return null;
    }

    if (!client.isOpen) return null;
    const cached = await client.get(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${key} (redis)`);
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error('Cache GET error:', error.message);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
async function setCached(key, value, ttlSeconds = 3600) {
  try {
    if (useInMemory || !client) {
      memoryStore.set(key, {
        value: value,
        expires: Date.now() + (ttlSeconds * 1000)
      });
      console.log(`📝 Cache SET: ${key} (memory, TTL: ${ttlSeconds}s)`);
      return true;
    }

    if (!client.isOpen) return false;
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    console.log(`📝 Cache SET: ${key} (redis, TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error('Cache SET error:', error.message);
    return false;
  }
}

/**
 * Delete cache key
 */
async function deleteCached(key) {
  try {
    if (useInMemory || !client) {
      memoryStore.delete(key);
      console.log(`🗑️  Cache DELETE: ${key} (memory)`);
      return true;
    }

    if (!client.isOpen) return false;
    await client.del(key);
    console.log(`🗑️  Cache DELETE: ${key} (redis)`);
    return true;
  } catch (error) {
    console.error('Cache DELETE error:', error.message);
    return false;
  }
}

/**
 * Increment counter
 */
async function incrementCounter(key, ttlSeconds = 3600) {
  try {
    if (useInMemory || !client) {
      const current = memoryStore.get(key);
      const newValue = (current?.value || 0) + 1;
      
      memoryStore.set(key, {
        value: newValue,
        expires: current?.expires || (Date.now() + (ttlSeconds * 1000))
      });
      
      return newValue;
    }

    if (!client.isOpen) return null;
    
    const value = await client.incr(key);
    
    if (value === 1) {
      await client.expire(key, ttlSeconds);
    }
    
    return value;
  } catch (error) {
    console.error('Counter increment error:', error.message);
    return null;
  }
}

/**
 * Get counter value
 */
async function getCounter(key) {
  try {
    if (useInMemory || !client) {
      const current = memoryStore.get(key);
      if (current && current.expires > Date.now()) {
        return current.value || 0;
      }
      return 0;
    }

    if (!client.isOpen) return null;
    const value = await client.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('Counter GET error:', error.message);
    return null;
  }
}

/**
 * Clear all cache (use with caution)
 */
async function clearAllCache() {
  try {
    if (useInMemory || !client) {
      memoryStore.clear();
      console.log('🧹 Cache cleared (memory)');
      return true;
    }

    if (!client.isOpen) return false;
    await client.flushDb();
    console.log('🧹 Cache cleared (redis)');
    return true;
  } catch (error) {
    console.error('Cache FLUSH error:', error.message);
    return false;
  }
}

/**
 * Middleware: Get cached response or call next
 */
function cacheMiddleware(key, ttlSeconds = 3600) {
  return async (req, res, next) => {
    try {
      // Try to get from cache
      const cached = await getCached(key);
      if (cached) {
        res.set('X-Cache-Status', 'HIT');
        return res.json(cached);
      }
      
      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache before sending
      res.json = function(data) {
        setCached(key, data, ttlSeconds).catch(err => 
          console.error('Failed to cache response:', err.message)
        );
        
        res.set('X-Cache-Status', 'MISS');
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next(); // Continue without cache on error
    }
  };
}

module.exports = {
  client,
  getCached,
  setCached,
  deleteCached,
  incrementCounter,
  getCounter,
  clearAllCache,
  cacheMiddleware,
  useInMemory: () => useInMemory
};
