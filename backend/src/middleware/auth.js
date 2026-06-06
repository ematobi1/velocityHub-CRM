const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set');
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Check subscription status
    if (user.subscription.status === 'cancelled' || user.subscription.status === 'past_due') {
      return res.status(403).json({
        error: 'Subscription inactive. Please update your billing.',
        subscriptionStatus: user.subscription.status
      });
    }

    // Reset monthly usage if needed
    user.resetMonthlyUsage();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(401).json({ error: 'Authentication failed.' });
  }
};

// Authorization middleware - check roles
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check feature access based on subscription
const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const user = req.user;

    // Check if user has exceeded limit
    if (user.hasExceededLimit(feature)) {
      return res.status(403).json({
        error: `${feature} limit exceeded`,
        limit: user.limits[feature],
        usage: user.usage[feature + 'Count'] || user.usage[feature + 'Minutes'],
        upgradeUrl: '/settings/billing'
      });
    }

    next();
  };
};

// Track usage for billable features
const trackUsage = (feature, amount = 1) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    // Will be updated after request completes
    res.on('finish', async () => {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          const usageField = feature + (feature === 'voice' ? 'Minutes' : 'Count');
          user.usage[usageField] = (user.usage[usageField] || 0) + amount;
          await user.save();
        }
      } catch (error) {
        // Don't fail the request if usage tracking fails
        console.error('Usage tracking error:', error);
      }
    });

    next();
  };
};

module.exports = {
  auth,
  authorize,
  checkFeatureAccess,
  trackUsage
};
