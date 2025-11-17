/**
 * Environment Variable Validation Utility
 * Validates required environment variables on application startup
 */

const logger = require('./logger');

/**
 * Required environment variables for the application to run
 */
const REQUIRED_ENV_VARS = {
  // Core Server Configuration
  PORT: {
    required: true,
    description: 'Server port number',
    default: '5000',
  },
  NODE_ENV: {
    required: true,
    description: 'Node environment (development, production, test)',
    default: 'development',
    validate: (value) => ['development', 'production', 'test'].includes(value),
  },

  // Database
  MONGODB_URI: {
    required: true,
    description: 'MongoDB connection string',
  },

  // Cache
  REDIS_URL: {
    required: true,
    description: 'Redis connection URL',
  },

  // Security
  JWT_SECRET: {
    required: true,
    description: 'JWT secret key (minimum 32 characters)',
    validate: (value) => value.length >= 32,
    validationMessage: 'JWT_SECRET must be at least 32 characters long',
  },

  // Frontend
  FRONTEND_URL: {
    required: true,
    description: 'Frontend application URL for CORS',
    default: 'http://localhost:3000',
  },
};

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = {
  // AI Services
  OPENAI_API_KEY: 'OpenAI API key for AI features',
  ANTHROPIC_API_KEY: 'Anthropic Claude API key for AI features',
  GROQ_API_KEY: 'Groq API key for AI features',

  // Communication Services
  TWILIO_ACCOUNT_SID: 'Twilio Account SID for SMS/Voice',
  TWILIO_AUTH_TOKEN: 'Twilio Auth Token',
  TWILIO_PHONE_NUMBER: 'Twilio phone number',

  // Email Service
  SMTP_HOST: 'SMTP server host',
  SMTP_PORT: 'SMTP server port',
  SMTP_USER: 'SMTP username',
  SMTP_PASSWORD: 'SMTP password',
  SMTP_FROM: 'Default sender email address',

  // Payment
  STRIPE_SECRET_KEY: 'Stripe secret key for payments',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook secret',

  // Document Signing
  DOCUSIGN_INTEGRATION_KEY: 'DocuSign integration key',
  DOCUSIGN_USER_ID: 'DocuSign user ID',
  DOCUSIGN_ACCOUNT_ID: 'DocuSign account ID',
  DOCUSIGN_PRIVATE_KEY: 'DocuSign private key',

  // Cloud Storage
  AWS_ACCESS_KEY_ID: 'AWS access key for S3',
  AWS_SECRET_ACCESS_KEY: 'AWS secret key',
  AWS_REGION: 'AWS region',
  AWS_S3_BUCKET: 'AWS S3 bucket name',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 'Rate limit window in milliseconds',
  RATE_LIMIT_MAX_REQUESTS: 'Maximum requests per window',
};

/**
 * Validates a single environment variable
 */
const validateEnvVar = (name, config) => {
  const value = process.env[name];

  // Check if required variable is missing
  if (config.required && !value) {
    if (config.default) {
      logger.warn(`${name} is not set, using default: ${config.default}`);
      process.env[name] = config.default;
      return { valid: true, warnings: [`Using default value for ${name}`] };
    }
    return {
      valid: false,
      error: `${name} is required but not set. ${config.description}`,
    };
  }

  // Run custom validation if provided
  if (value && config.validate) {
    if (!config.validate(value)) {
      return {
        valid: false,
        error: config.validationMessage || `${name} validation failed`,
      };
    }
  }

  return { valid: true };
};

/**
 * Validates all environment variables
 */
const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  logger.info('Validating environment variables...');

  // Validate required variables
  Object.entries(REQUIRED_ENV_VARS).forEach(([name, config]) => {
    const result = validateEnvVar(name, config);
    if (!result.valid) {
      errors.push(result.error);
    }
    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  });

  // Check optional variables
  Object.entries(OPTIONAL_ENV_VARS).forEach(([name, description]) => {
    if (!process.env[name]) {
      warnings.push(`Optional variable ${name} is not set: ${description}`);
    }
  });

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment variable warnings:');
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  // Handle errors
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach((error) => logger.error(`  - ${error}`));
    logger.error('\nPlease check your .env file and ensure all required variables are set.');
    logger.error('See .env.example for reference.\n');
    throw new Error('Environment validation failed');
  }

  logger.info('Environment validation successful');

  // Log environment info
  logger.info(`Running in ${process.env.NODE_ENV} mode`);
  logger.info(`Server will start on port ${process.env.PORT}`);

  return true;
};

/**
 * Get summary of environment configuration
 */
const getEnvSummary = () => {
  const configured = {};
  const missing = {};

  // Check required vars
  Object.keys(REQUIRED_ENV_VARS).forEach((name) => {
    if (process.env[name]) {
      configured[name] = '✓';
    } else {
      missing[name] = '✗';
    }
  });

  // Check optional vars
  Object.keys(OPTIONAL_ENV_VARS).forEach((name) => {
    if (process.env[name]) {
      configured[name] = '✓ (optional)';
    }
  });

  return { configured, missing };
};

module.exports = {
  validateEnvironment,
  getEnvSummary,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
};
