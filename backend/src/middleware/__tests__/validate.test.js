/**
 * Tests for validation middleware
 */

const Joi = require('joi');
const { validate, validateObjectId, sanitizeInput } = require('../validate');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
      method: 'POST',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validate middleware', () => {
    const testSchema = Joi.object({
      email: Joi.string().email().required(),
      age: Joi.number().integer().min(0).optional(),
    });

    it('should pass validation with valid data', () => {
      mockReq.body = {
        email: 'test@example.com',
        age: 25,
      };

      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid email', () => {
      mockReq.body = {
        email: 'invalid-email',
      };

      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with missing required field', () => {
      mockReq.body = {};

      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      mockReq.body = {
        email: 'test@example.com',
        unknownField: 'should be removed',
      };

      const middleware = validate(testSchema);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.unknownField).toBeUndefined();
    });

    it('should apply default values', () => {
      const schemaWithDefaults = Joi.object({
        name: Joi.string().default('Anonymous'),
      });

      const middleware = validate(schemaWithDefaults);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('Anonymous');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate query parameters when specified', () => {
      mockReq.query = {
        page: '1',
        limit: 'invalid',
      };

      const querySchema = Joi.object({
        page: Joi.number().integer().required(),
        limit: Joi.number().integer().required(),
      });

      const middleware = validate(querySchema, 'query');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateObjectId middleware', () => {
    it('should pass with valid ObjectId', () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';

      const middleware = validateObjectId();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with invalid ObjectId', () => {
      mockReq.params.id = 'invalid-id';

      const middleware = validateObjectId();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid ID format',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail with empty ObjectId', () => {
      mockReq.params.id = '';

      const middleware = validateObjectId();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate custom param name', () => {
      mockReq.params.userId = 'invalid-id';

      const middleware = validateObjectId('userId');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeInput middleware', () => {
    it('should remove MongoDB operators from body', () => {
      mockReq.body = {
        email: 'test@example.com',
        $where: 'malicious code',
        $ne: 'attack',
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.$where).toBeUndefined();
      expect(mockReq.body.$ne).toBeUndefined();
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove nested MongoDB operators', () => {
      mockReq.body = {
        user: {
          email: 'test@example.com',
          $gt: 'attack',
        },
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.user.$gt).toBeUndefined();
      expect(mockReq.body.user.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: 'test',
        $regex: 'attack',
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query.$regex).toBeUndefined();
      expect(mockReq.query.search).toBe('test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty objects', () => {
      mockReq.body = {};
      mockReq.query = {};

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
