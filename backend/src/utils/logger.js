const winston = require('winston');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  }),
];

// File logging only when not in a serverless/read-only environment
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  try {
    const fs = require('fs');
    fs.mkdirSync('logs', { recursive: true });
    transports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    transports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
  } catch (_) {
    // Filesystem not writable — console only
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'velocityhub-api' },
  transports,
});

module.exports = logger;
