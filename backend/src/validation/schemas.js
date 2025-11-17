/**
 * Joi Validation Schemas
 * Centralized validation schemas for all API endpoints
 */

const Joi = require('joi');

// Custom validators
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const email = Joi.string().email().lowercase().trim();
const phone = Joi.string().pattern(/^\+?[1-9]\d{1,14}$/); // E.164 format
const url = Joi.string().uri();

// ============================================================================
// Authentication Schemas
// ============================================================================

const authSchemas = {
  register: Joi.object({
    email: email.required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required',
    }),
    companyName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name cannot exceed 100 characters',
      'any.required': 'Company name is required',
    }),
  }),

  login: Joi.object({
    email: email.required(),
    password: Joi.string().required(),
  }),

  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};

// ============================================================================
// Lead Schemas
// ============================================================================

const leadSchemas = {
  create: Joi.object({
    email: email.required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    company: Joi.string().max(100).optional(),
    phone: phone.optional(),
    source: Joi.string()
      .valid('website', 'referral', 'social', 'email', 'event', 'other')
      .optional(),
    status: Joi.string()
      .valid('new', 'contacted', 'qualified', 'converted', 'lost')
      .default('new'),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    customFields: Joi.object().optional(),
  }),

  update: Joi.object({
    email: email.optional(),
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    company: Joi.string().max(100).optional(),
    phone: phone.optional(),
    source: Joi.string()
      .valid('website', 'referral', 'social', 'email', 'event', 'other')
      .optional(),
    status: Joi.string()
      .valid('new', 'contacted', 'qualified', 'converted', 'lost')
      .optional(),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    customFields: Joi.object().optional(),
  }).min(1), // At least one field must be updated

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid('new', 'contacted', 'qualified', 'converted', 'lost')
      .optional(),
    search: Joi.string().max(100).optional(),
    minScore: Joi.number().min(0).max(100).optional(),
    maxScore: Joi.number().min(0).max(100).optional(),
    source: Joi.string().optional(),
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'score', 'lastName')
      .default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// ============================================================================
// Deal Schemas
// ============================================================================

const dealSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    value: Joi.number().min(0).required(),
    stage: Joi.string()
      .valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')
      .default('prospecting'),
    probability: Joi.number().min(0).max(100).optional(),
    expectedCloseDate: Joi.date().optional(),
    contact: objectId.optional(),
    company: objectId.optional(),
    description: Joi.string().max(1000).optional(),
    products: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
    })).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    value: Joi.number().min(0).optional(),
    stage: Joi.string()
      .valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')
      .optional(),
    probability: Joi.number().min(0).max(100).optional(),
    expectedCloseDate: Joi.date().optional(),
    contact: objectId.optional(),
    company: objectId.optional(),
    description: Joi.string().max(1000).optional(),
    products: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
    })).optional(),
  }).min(1),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    stage: Joi.string()
      .valid('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')
      .optional(),
    minValue: Joi.number().min(0).optional(),
    maxValue: Joi.number().min(0).optional(),
    search: Joi.string().max(100).optional(),
  }),
};

// ============================================================================
// Contact Schemas
// ============================================================================

const contactSchemas = {
  create: Joi.object({
    email: email.required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    company: objectId.optional(),
    phone: phone.optional(),
    position: Joi.string().max(100).optional(),
    linkedIn: url.optional(),
    twitter: Joi.string().max(50).optional(),
  }),

  update: Joi.object({
    email: email.optional(),
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    company: objectId.optional(),
    phone: phone.optional(),
    position: Joi.string().max(100).optional(),
    linkedIn: url.optional(),
    twitter: Joi.string().max(50).optional(),
  }).min(1),
};

// ============================================================================
// Company Schemas
// ============================================================================

const companySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    website: url.optional(),
    industry: Joi.string().max(100).optional(),
    size: Joi.string()
      .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
      .optional(),
    revenue: Joi.number().min(0).optional(),
    phone: phone.optional(),
    address: Joi.object({
      street: Joi.string().max(200).optional(),
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      country: Joi.string().max(100).optional(),
      postalCode: Joi.string().max(20).optional(),
    }).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    website: url.optional(),
    industry: Joi.string().max(100).optional(),
    size: Joi.string()
      .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
      .optional(),
    revenue: Joi.number().min(0).optional(),
    phone: phone.optional(),
    address: Joi.object({
      street: Joi.string().max(200).optional(),
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      country: Joi.string().max(100).optional(),
      postalCode: Joi.string().max(20).optional(),
    }).optional(),
  }).min(1),
};

// ============================================================================
// Email Sequence Schemas
// ============================================================================

const emailSequenceSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    subject: Joi.string().min(1).max(200).required(),
    body: Joi.string().min(1).max(10000).required(),
    delayDays: Joi.number().integer().min(0).max(365).default(0),
    isActive: Joi.boolean().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    subject: Joi.string().min(1).max(200).optional(),
    body: Joi.string().min(1).max(10000).optional(),
    delayDays: Joi.number().integer().min(0).max(365).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

// ============================================================================
// Workflow Schemas
// ============================================================================

const workflowSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    trigger: Joi.object({
      type: Joi.string().valid('lead_created', 'deal_stage_change', 'form_submission', 'email_opened').required(),
      conditions: Joi.object().optional(),
    }).required(),
    actions: Joi.array().items(Joi.object({
      type: Joi.string().valid('send_email', 'create_task', 'update_field', 'send_sms').required(),
      config: Joi.object().required(),
    })).min(1).required(),
    isActive: Joi.boolean().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    trigger: Joi.object({
      type: Joi.string().valid('lead_created', 'deal_stage_change', 'form_submission', 'email_opened').optional(),
      conditions: Joi.object().optional(),
    }).optional(),
    actions: Joi.array().items(Joi.object({
      type: Joi.string().valid('send_email', 'create_task', 'update_field', 'send_sms').required(),
      config: Joi.object().required(),
    })).min(1).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  authSchemas,
  leadSchemas,
  dealSchemas,
  contactSchemas,
  companySchemas,
  emailSequenceSchemas,
  workflowSchemas,
};
