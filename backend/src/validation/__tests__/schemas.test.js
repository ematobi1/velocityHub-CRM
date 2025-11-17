/**
 * Tests for validation schemas
 */

const {
  authSchemas,
  leadSchemas,
  dealSchemas,
  contactSchemas,
  companySchemas,
} = require('../schemas');

describe('Validation Schemas', () => {
  describe('Auth Schemas', () => {
    describe('register schema', () => {
      it('should validate valid registration data', () => {
        const data = {
          email: 'user@example.com',
          password: 'SecurePass123',
          companyName: 'Acme Corp',
        };

        const { error } = authSchemas.register.validate(data);
        expect(error).toBeUndefined();
      });

      it('should reject invalid email', () => {
        const data = {
          email: 'invalid-email',
          password: 'SecurePass123',
          companyName: 'Acme Corp',
        };

        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
      });

      it('should reject short password', () => {
        const data = {
          email: 'user@example.com',
          password: 'short',
          companyName: 'Acme Corp',
        };

        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('8 characters');
      });

      it('should reject missing companyName', () => {
        const data = {
          email: 'user@example.com',
          password: 'SecurePass123',
        };

        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
      });
    });

    describe('login schema', () => {
      it('should validate valid login data', () => {
        const data = {
          email: 'user@example.com',
          password: 'password123',
        };

        const { error } = authSchemas.login.validate(data);
        expect(error).toBeUndefined();
      });

      it('should reject missing password', () => {
        const data = {
          email: 'user@example.com',
        };

        const { error } = authSchemas.login.validate(data);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Lead Schemas', () => {
    describe('create schema', () => {
      it('should validate valid lead data', () => {
        const data = {
          email: 'lead@example.com',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Tech Corp',
          phone: '+14155552671',
        };

        const { error } = leadSchemas.create.validate(data);
        expect(error).toBeUndefined();
      });

      it('should apply default status', () => {
        const data = {
          email: 'lead@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };

        const { error, value } = leadSchemas.create.validate(data);
        expect(error).toBeUndefined();
        expect(value.status).toBe('new');
      });

      it('should validate status enum', () => {
        const data = {
          email: 'lead@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'invalid-status',
        };

        const { error } = leadSchemas.create.validate(data);
        expect(error).toBeDefined();
      });

      it('should limit tags array', () => {
        const data = {
          email: 'lead@example.com',
          firstName: 'John',
          lastName: 'Doe',
          tags: Array(11).fill('tag'),
        };

        const { error } = leadSchemas.create.validate(data);
        expect(error).toBeDefined();
      });
    });

    describe('query schema', () => {
      it('should apply default pagination', () => {
        const data = {};

        const { error, value } = leadSchemas.query.validate(data);
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
      });

      it('should validate minScore range', () => {
        const data = {
          minScore: 150, // Invalid: > 100
        };

        const { error } = leadSchemas.query.validate(data);
        expect(error).toBeDefined();
      });

      it('should limit max page size', () => {
        const data = {
          limit: 200, // Invalid: > 100
        };

        const { error } = leadSchemas.query.validate(data);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Deal Schemas', () => {
    describe('create schema', () => {
      it('should validate valid deal data', () => {
        const data = {
          name: 'Enterprise Deal',
          value: 50000,
          stage: 'qualification',
          probability: 75,
        };

        const { error } = dealSchemas.create.validate(data);
        expect(error).toBeUndefined();
      });

      it('should reject negative value', () => {
        const data = {
          name: 'Deal',
          value: -1000,
        };

        const { error } = dealSchemas.create.validate(data);
        expect(error).toBeDefined();
      });

      it('should validate probability range', () => {
        const data = {
          name: 'Deal',
          value: 10000,
          probability: 150, // Invalid: > 100
        };

        const { error } = dealSchemas.create.validate(data);
        expect(error).toBeDefined();
      });

      it('should validate products array', () => {
        const data = {
          name: 'Deal',
          value: 10000,
          products: [
            { name: 'Product 1', quantity: 5, price: 100 },
            { name: 'Product 2', quantity: 2, price: 250 },
          ],
        };

        const { error } = dealSchemas.create.validate(data);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('Contact Schemas', () => {
    it('should validate valid contact data', () => {
      const data = {
        email: 'contact@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        position: 'CTO',
      };

      const { error } = contactSchemas.create.validate(data);
      expect(error).toBeUndefined();
    });

    it('should validate LinkedIn URL', () => {
      const data = {
        email: 'contact@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        linkedIn: 'not-a-url',
      };

      const { error } = contactSchemas.create.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe('Company Schemas', () => {
    it('should validate valid company data', () => {
      const data = {
        name: 'Tech Innovations Inc',
        website: 'https://techinnovations.com',
        industry: 'Technology',
        size: '51-200',
      };

      const { error } = companySchemas.create.validate(data);
      expect(error).toBeUndefined();
    });

    it('should validate size enum', () => {
      const data = {
        name: 'Company',
        size: 'invalid-size',
      };

      const { error } = companySchemas.create.validate(data);
      expect(error).toBeDefined();
    });

    it('should validate address object', () => {
      const data = {
        name: 'Company',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          postalCode: '94105',
        },
      };

      const { error } = companySchemas.create.validate(data);
      expect(error).toBeUndefined();
    });
  });
});
