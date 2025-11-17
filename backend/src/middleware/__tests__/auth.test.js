/**
 * Tests for authentication middleware
 */

const jwt = require('jsonwebtoken');
const { auth, authorize } = require('../auth');

describe('Authentication Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('auth middleware', () => {
    it('should reject requests without token', async () => {
      mockReq.header.mockReturnValue(undefined);

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid token', async () => {
      mockReq.header.mockReturnValue('Bearer invalid-token');

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw error if JWT_SECRET is not configured', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const token = jwt.sign({ userId: '123' }, 'test-secret');
      mockReq.header.mockReturnValue(`Bearer ${token}`);

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);

      // Restore JWT_SECRET
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('authorize middleware', () => {
    it('should reject if user is not authenticated', () => {
      const middleware = authorize(['admin']);
      mockReq.user = undefined;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if user lacks required role', () => {
      const middleware = authorize(['admin']);
      mockReq.user = { role: 'user' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow if user has required role', () => {
      const middleware = authorize(['admin']);
      mockReq.user = { role: 'admin' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow if no roles specified', () => {
      const middleware = authorize([]);
      mockReq.user = { role: 'user' };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
