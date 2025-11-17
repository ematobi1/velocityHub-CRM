/**
 * Jest Setup File
 * Runs before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/velocityhub_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.PORT = '5001';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test timeout
jest.setTimeout(10000);
