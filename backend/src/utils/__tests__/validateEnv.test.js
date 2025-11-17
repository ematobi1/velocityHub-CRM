/**
 * Tests for environment validation utility
 */

const { validateEnvironment, getEnvSummary } = require('../validateEnv');

describe('Environment Validation', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should pass with all required environment variables', () => {
      // All required vars are set in jest.setup.js
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should throw error when MONGODB_URI is missing', () => {
      delete process.env.MONGODB_URI;
      expect(() => validateEnvironment()).toThrow('Environment validation failed');
    });

    it('should throw error when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';
      expect(() => validateEnvironment()).toThrow();
    });

    it('should validate NODE_ENV values', () => {
      process.env.NODE_ENV = 'invalid';
      expect(() => validateEnvironment()).toThrow();
    });
  });

  describe('getEnvSummary', () => {
    it('should return configured and missing variables', () => {
      const summary = getEnvSummary();
      expect(summary).toHaveProperty('configured');
      expect(summary).toHaveProperty('missing');
      expect(typeof summary.configured).toBe('object');
      expect(typeof summary.missing).toBe('object');
    });

    it('should mark configured required variables', () => {
      const summary = getEnvSummary();
      expect(summary.configured).toHaveProperty('JWT_SECRET');
      expect(summary.configured).toHaveProperty('MONGODB_URI');
    });
  });
});
