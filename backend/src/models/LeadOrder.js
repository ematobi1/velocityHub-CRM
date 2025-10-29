const mongoose = require('mongoose');

// Verified Lead Purchase System (MAJOR DIFFERENTIATOR & REVENUE STREAM)
const leadOrderSchema = new mongoose.Schema({
  // Order details
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'partially_delivered', 'failed', 'refunded'],
    default: 'pending'
  },
  // Customer
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String,
    company: String
  },
  // Order specification
  specification: {
    // Industry targeting
    industries: [String],
    // Company size
    companySize: [{
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    }],
    // Location
    locations: {
      countries: [String],
      states: [String],
      cities: [String]
    },
    // Job titles
    jobTitles: [String],
    // Department
    departments: [String],
    // Revenue range
    revenueRange: {
      min: Number,
      max: Number,
      currency: String
    },
    // Technologies used
    technologies: [String],
    // Employee growth
    employeeGrowth: {
      type: String,
      enum: ['declining', 'stable', 'growing', 'fast_growing']
    },
    // Funding stage
    fundingStage: {
      type: String,
      enum: ['bootstrapped', 'seed', 'series_a', 'series_b', 'series_c', 'public']
    },
    // Intent signals
    intentSignals: [String], // e.g., 'hiring', 'expanding', 'new_funding'
    // Exclude companies
    excludeCompanies: [String],
    // Custom requirements
    customRequirements: String
  },
  // Package selected
  package: {
    name: String, // e.g., "Starter Pack", "Growth Pack", "Enterprise Pack"
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pricePerLead: Number,
    subtotal: Number,
    discount: {
      type: String,
      code: String,
      amount: Number,
      percentage: Number
    },
    total: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  // Lead source
  source: {
    provider: {
      type: String,
      enum: ['apollo', 'zoominfo', 'lusha', 'cognism', 'leadiq', 'internal'],
      required: true
    },
    // Quality tier
    tier: {
      type: String,
      enum: ['verified', 'premium', 'enriched'],
      default: 'verified'
    },
    // Data freshness
    maxAge: {
      type: Number, // days
      default: 90
    }
  },
  // Delivery
  delivery: {
    method: {
      type: String,
      enum: ['direct_import', 'csv_export', 'api'],
      default: 'direct_import'
    },
    // For direct import
    importedCount: {
      type: Number,
      default: 0
    },
    importedLeads: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    }],
    // For CSV export
    exportUrl: String,
    exportedAt: Date,
    // Delivery status
    deliveredAt: Date,
    deliveryAttempts: {
      type: Number,
      default: 0
    },
    lastAttemptAt: Date,
    failureReason: String
  },
  // Quality assurance
  quality: {
    // Pre-delivery validation
    validation: {
      emailVerified: Number, // count
      phoneVerified: Number,
      dataCompleteness: Number, // percentage
      duplicatesRemoved: Number
    },
    // Post-delivery quality
    feedback: {
      validLeads: Number,
      invalidLeads: Number,
      duplicates: Number,
      qualityRating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String
    },
    // Quality guarantee
    guarantee: {
      minimumValidity: Number, // percentage
      replacementOffered: Boolean,
      replacementCount: Number
    }
  },
  // Lead details delivered
  leadsDelivered: [{
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    sourceId: String, // ID from source provider
    deliveredAt: Date,
    // Quality flags
    quality: {
      emailValid: Boolean,
      phoneValid: Boolean,
      dataComplete: Number, // percentage
      lastVerified: Date
    },
    // Enrichment data
    enrichment: {
      socialProfiles: {
        linkedin: String,
        twitter: String,
        facebook: String
      },
      companyInfo: mongoose.Schema.Types.Mixed,
      technographics: [String],
      intentData: [{
        signal: String,
        strength: String,
        detectedAt: Date
      }]
    }
  }],
  // Payment
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'subscription_credit', 'invoice', 'free_trial'],
      required: true
    },
    // Stripe
    stripePaymentIntentId: String,
    stripeChargeId: String,
    // Invoice
    invoiceNumber: String,
    invoiceUrl: String,
    // Transaction
    transactionId: String,
    paidAt: Date,
    // Refund
    refunded: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date
  },
  // Processing
  processing: {
    startedAt: Date,
    completedAt: Date,
    duration: Number, // seconds
    // API calls to source provider
    apiCalls: [{
      provider: String,
      endpoint: String,
      timestamp: Date,
      responseTime: Number,
      recordsReturned: Number,
      success: Boolean,
      error: String
    }],
    // Errors
    errors: [{
      stage: String,
      error: String,
      timestamp: Date
    }]
  },
  // Analytics
  analytics: {
    // How these leads perform
    converted: { type: Number, default: 0 },
    qualified: { type: Number, default: 0 },
    contacted: { type: Number, default: 0 },
    dealsCreated: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    // Performance metrics
    conversionRate: Number,
    avgDaysToConversion: Number,
    roi: Number
  },
  // Notes
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Internal flags
  internal: {
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes
leadOrderSchema.index({ 'customer.userId': 1, createdAt: -1 });
leadOrderSchema.index({ orderNumber: 1 });
leadOrderSchema.index({ status: 1 });
leadOrderSchema.index({ 'source.provider': 1 });
leadOrderSchema.index({ createdAt: -1 });

// Generate order number
leadOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.orderNumber = `LEAD-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate package total
leadOrderSchema.methods.calculateTotal = function() {
  let total = this.package.quantity * this.package.pricePerLead;
  this.package.subtotal = total;

  // Apply discount
  if (this.package.discount) {
    if (this.package.discount.percentage) {
      this.package.discount.amount = total * (this.package.discount.percentage / 100);
    }
    total -= this.package.discount.amount;
  }

  this.package.total = total;
  return total;
};

// Process order
leadOrderSchema.methods.process = async function() {
  // Will be implemented in lead generation service
  return { status: 'processing' };
};

// Validate delivered leads
leadOrderSchema.methods.validateLeads = function() {
  const validation = {
    total: this.delivery.importedCount,
    valid: 0,
    invalid: 0,
    duplicates: 0
  };

  // Validation logic will be in service
  return validation;
};

module.exports = mongoose.model('LeadOrder', leadOrderSchema);
