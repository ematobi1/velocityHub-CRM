/**
 * Swagger/OpenAPI Configuration
 * Auto-generates API documentation from JSDoc comments
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VelocityHub CRM API',
      version: '1.0.0',
      description: 'AI-Powered Sales Intelligence Platform - Complete API Documentation',
      contact: {
        name: 'Kingdom (Emmanuel Tobi)',
        email: 'support@velocityhub.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.velocityhub.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            companyName: {
              type: 'string',
              description: 'Company name',
              example: 'Acme Corp',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              default: 'user',
            },
            subscription: {
              type: 'object',
              properties: {
                tier: {
                  type: 'string',
                  enum: ['free', 'starter', 'professional', 'enterprise'],
                  description: 'Subscription tier',
                },
                status: {
                  type: 'string',
                  enum: ['active', 'cancelled', 'past_due'],
                  description: 'Subscription status',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
          },
        },
        Lead: {
          type: 'object',
          required: ['email', 'firstName', 'lastName'],
          properties: {
            _id: {
              type: 'string',
              description: 'Lead ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Lead email address',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            company: {
              type: 'string',
              description: 'Company name',
            },
            phone: {
              type: 'string',
              description: 'Phone number',
            },
            status: {
              type: 'string',
              enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
              description: 'Lead status',
            },
            score: {
              type: 'number',
              description: 'AI-generated lead score (0-100)',
              minimum: 0,
              maximum: 100,
            },
            source: {
              type: 'string',
              description: 'Lead source',
            },
            owner: {
              type: 'string',
              description: 'User ID of lead owner',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Lead tags',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Deal: {
          type: 'object',
          required: ['name', 'value', 'stage'],
          properties: {
            _id: {
              type: 'string',
              description: 'Deal ID',
            },
            name: {
              type: 'string',
              description: 'Deal name',
            },
            value: {
              type: 'number',
              description: 'Deal value in dollars',
            },
            stage: {
              type: 'string',
              enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
              description: 'Deal stage',
            },
            probability: {
              type: 'number',
              description: 'Win probability percentage',
              minimum: 0,
              maximum: 100,
            },
            expectedCloseDate: {
              type: 'string',
              format: 'date',
              description: 'Expected close date',
            },
            contact: {
              type: 'string',
              description: 'Contact ID',
            },
            company: {
              type: 'string',
              description: 'Company ID',
            },
            owner: {
              type: 'string',
              description: 'User ID of deal owner',
            },
          },
        },
        Contact: {
          type: 'object',
          required: ['email', 'firstName', 'lastName'],
          properties: {
            _id: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            company: {
              type: 'string',
              description: 'Company ID',
            },
            phone: {
              type: 'string',
            },
            position: {
              type: 'string',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Access denied. No token provided.',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have required permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Forbidden. Insufficient permissions.',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Resource not found',
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: 'Validation failed',
                details: {
                  field: 'email',
                  message: 'Invalid email format',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Leads',
        description: 'Lead management endpoints',
      },
      {
        name: 'Deals',
        description: 'Deal pipeline management',
      },
      {
        name: 'Contacts',
        description: 'Contact management',
      },
      {
        name: 'Companies',
        description: 'Company management',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints',
      },
      {
        name: 'AI Features',
        description: 'AI-powered features (chatbot, scoring, analytics)',
      },
      {
        name: 'Workflows',
        description: 'Marketing automation workflows',
      },
      {
        name: 'Email Sequences',
        description: 'Email campaign management',
      },
    ],
  },
  apis: [
    './src/routes/*.js', // Path to route files with JSDoc comments
    './src/models/*.js', // Path to model files
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
