/**
 * Cache Middleware
 * Provides Express middleware for route caching
 */

const cache = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds (default: 300 = 5min)
 * @param {Function} keyGenerator - Function to generate cache key from req
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `route:${req.originalUrl}:user:${req.user?._id || 'anonymous'}`;

    try {
      // Check cache
      const cachedResponse = await cache.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      logger.debug(`Cache MISS: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (body) => {
        // Cache the response
        cache.set(cacheKey, body, ttl).catch((err) => {
          logger.error('Failed to cache response:', err);
        });

        // Send the response
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Invalidate cache for specific pattern
 * @param {string} pattern - Cache key pattern
 * @returns {Function} Express middleware
 */
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      const deletedCount = await cache.delPattern(pattern);
      logger.debug(`Invalidated ${deletedCount} cache entries matching: ${pattern}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
    next();
  };
};

/**
 * Conditional cache middleware
 * Only caches if condition function returns true
 * @param {Function} condition - Function that returns boolean
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware
 */
const conditionalCache = (condition, ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    return cacheMiddleware(ttl)(req, res, next);
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  conditionalCache,
};
