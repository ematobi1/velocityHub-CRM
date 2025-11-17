/**
 * Sentry Error Monitoring Configuration
 * Tracks errors, performance, and provides real-time alerts
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('../utils/logger');

/**
 * Initialize Sentry error monitoring
 * @param {Express} app - Express application instance
 */
const initSentry = (app) => {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured, error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Set sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Set sample rate for profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable profiling
      new ProfilingIntegration(),
    ],

    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== 'test',

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive data from context
      if (event.contexts?.user) {
        delete event.contexts.user.password;
        delete event.contexts.user.token;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Ignore JWT expiration errors (expected behavior)
      'TokenExpiredError',
      'JsonWebTokenError',
      // Ignore validation errors (handled by application)
      'ValidationError',
      // Ignore common bot/crawler errors
      'ECONNREFUSED',
      'ETIMEDOUT',
    ],
  });

  logger.info('Sentry error monitoring initialized');
};

/**
 * Capture exception with additional context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const captureException = (error, context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  logger.error('Exception captured:', error, context);
};

/**
 * Capture message with level
 * @param {string} message - Message to log
 * @param {string} level - Severity level
 * @param {Object} context - Additional context
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  logger[level](message, context);
};

/**
 * Set user context for error tracking
 * @param {Object} user - User object
 */
const setUser = (user) => {
  if (process.env.SENTRY_DSN && user) {
    Sentry.setUser({
      id: user._id?.toString(),
      email: user.email,
      username: user.email,
      role: user.role,
    });
  }
};

/**
 * Clear user context
 */
const clearUser = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
const addBreadcrumb = (breadcrumb) => {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

module.exports = {
  Sentry,
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
};
