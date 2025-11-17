/**
 * Validation Middleware
 * Validates request data against Joi schemas
 */

const logger = require('../utils/logger');

/**
 * Create validation middleware for request validation
 * @param {Object} schema - Joi schema
 * @param {string} property - Property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      errors: {
        wrap: {
          label: '', // Remove quotes around field names in error messages
        },
      },
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors,
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace request data with validated value (includes defaults and type coercion)
    req[property] = value;
    next();
  };
};

/**
 * Validate MongoDB ObjectId parameter
 * @param {string} paramName - Parameter name to validate
 * @returns {Function} Express middleware
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: [
          {
            field: paramName,
            message: `${paramName} must be a valid MongoDB ObjectId`,
          },
        ],
      });
    }

    next();
  };
};

/**
 * Sanitize input to prevent NoSQL injection
 * Removes MongoDB operators from user input
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        // Remove keys starting with $ (MongoDB operators)
        if (key.startsWith('$')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

module.exports = {
  validate,
  validateObjectId,
  sanitizeInput,
};
