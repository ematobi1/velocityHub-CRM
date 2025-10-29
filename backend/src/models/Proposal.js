const mongoose = require('mongoose');

// Smart Proposal Generator with AI & E-Signature (KEY DIFFERENTIATOR)
const proposalSchema = new mongoose.Schema({
  // Basic info
  title: {
    type: String,
    required: true,
    trim: true
  },
  proposalNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'],
    default: 'draft'
  },
  // Relationships
  deal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Proposal content
  content: {
    // Executive summary
    executiveSummary: String,
    // Problem statement
    problemStatement: String,
    // Proposed solution
    solution: String,
    // Deliverables
    deliverables: [{
      title: String,
      description: String,
      timeline: String
    }],
    // Timeline/milestones
    timeline: [{
      milestone: String,
      description: String,
      dueDate: Date,
      deliverables: [String]
    }],
    // Terms & conditions
    terms: String,
    // Additional sections
    customSections: [{
      title: String,
      content: String,
      order: Number
    }]
  },
  // Pricing
  pricing: {
    items: [{
      name: String,
      description: String,
      quantity: Number,
      unitPrice: Number,
      discount: {
        type: {
          type: String,
          enum: ['percentage', 'fixed']
        },
        value: Number
      },
      total: Number
    }],
    subtotal: Number,
    tax: {
      rate: Number,
      amount: Number
    },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: Number,
      amount: Number
    },
    total: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  // AI-Generated Content (UNIQUE FEATURE)
  aiGenerated: {
    used: {
      type: Boolean,
      default: false
    },
    sections: [{
      section: String, // which section was AI-generated
      originalPrompt: String,
      generatedContent: String,
      edited: Boolean,
      confidence: Number
    }],
    // AI learns from winning proposals
    basedOn: {
      similarWonProposals: [{
        proposalId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Proposal'
        },
        similarity: Number // 0-100
      }],
      industryBestPractices: [String]
    },
    // AI recommendations
    recommendations: [{
      type: {
        type: String,
        enum: ['pricing', 'content', 'structure', 'delivery']
      },
      suggestion: String,
      reasoning: String,
      estimatedImpact: String
    }],
    generatedAt: Date,
    modelVersion: String
  },
  // Delivery
  delivery: {
    method: {
      type: String,
      enum: ['email', 'link', 'download'],
      default: 'link'
    },
    sentAt: Date,
    sentTo: [{
      email: String,
      name: String,
      role: String
    }],
    expiresAt: Date
  },
  // Tracking
  tracking: {
    views: [{
      viewedAt: Date,
      viewerEmail: String,
      ipAddress: String,
      userAgent: String,
      duration: Number, // seconds
      pagesViewed: [Number]
    }],
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    avgTimeSpent: Number, // seconds
    lastViewedAt: Date,
    // Heat map - which sections got most attention
    sectionEngagement: [{
      section: String,
      viewTime: Number,
      revisits: Number
    }]
  },
  // E-Signature Integration (DocuSign)
  signature: {
    required: {
      type: Boolean,
      default: false
    },
    signers: [{
      name: String,
      email: String,
      role: String,
      signedAt: Date,
      ipAddress: String,
      status: {
        type: String,
        enum: ['pending', 'viewed', 'signed', 'declined']
      }
    }],
    envelopeId: String, // DocuSign envelope ID
    documentId: String,
    status: {
      type: String,
      enum: ['not_sent', 'sent', 'delivered', 'signed', 'completed', 'declined', 'voided']
    },
    completedAt: Date,
    voidedReason: String
  },
  // Files & attachments
  attachments: [{
    name: String,
    type: String, // pdf, image, video
    url: String,
    size: Number,
    uploadedAt: Date
  }],
  // Template used
  template: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProposalTemplate'
    },
    name: String
  },
  // Branding
  branding: {
    logo: String,
    primaryColor: String,
    secondaryColor: String,
    companyName: String,
    companyAddress: String,
    companyPhone: String,
    companyEmail: String,
    companyWebsite: String
  },
  // Response
  response: {
    decision: {
      type: String,
      enum: ['accepted', 'declined', 'needs_revision']
    },
    feedback: String,
    respondedAt: Date,
    respondedBy: String
  },
  // Version control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    content: mongoose.Schema.Types.Mixed,
    createdAt: Date
  }],
  // Notes
  internalNotes: String,
  // Cost tracking (for billing)
  cost: {
    generated: Boolean,
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  }
}, {
  timestamps: true
});

// Indexes
proposalSchema.index({ deal: 1 });
proposalSchema.index({ contact: 1 });
proposalSchema.index({ createdBy: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ proposalNumber: 1 });
proposalSchema.index({ createdAt: -1 });

// Generate proposal number
proposalSchema.pre('save', async function(next) {
  if (this.isNew && !this.proposalNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.proposalNumber = `PROP-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate pricing totals
proposalSchema.methods.calculateTotals = function() {
  let subtotal = 0;

  // Calculate item totals
  this.pricing.items.forEach(item => {
    let itemTotal = item.quantity * item.unitPrice;

    // Apply item discount
    if (item.discount) {
      if (item.discount.type === 'percentage') {
        itemTotal -= itemTotal * (item.discount.value / 100);
      } else {
        itemTotal -= item.discount.value;
      }
    }

    item.total = itemTotal;
    subtotal += itemTotal;
  });

  this.pricing.subtotal = subtotal;

  // Apply overall discount
  let discountAmount = 0;
  if (this.pricing.discount) {
    if (this.pricing.discount.type === 'percentage') {
      discountAmount = subtotal * (this.pricing.discount.value / 100);
    } else {
      discountAmount = this.pricing.discount.value;
    }
    this.pricing.discount.amount = discountAmount;
  }

  // Calculate tax
  const taxableAmount = subtotal - discountAmount;
  if (this.pricing.tax) {
    this.pricing.tax.amount = taxableAmount * (this.pricing.tax.rate / 100);
  }

  // Calculate total
  this.pricing.total = taxableAmount + (this.pricing.tax?.amount || 0);

  return this.pricing;
};

// Track view
proposalSchema.methods.trackView = function(viewerInfo) {
  this.tracking.views.push({
    viewedAt: new Date(),
    ...viewerInfo
  });
  this.tracking.totalViews++;
  this.tracking.lastViewedAt = new Date();

  if (this.status === 'sent') {
    this.status = 'viewed';
  }
};

// Request AI generation
proposalSchema.methods.generateWithAI = async function(prompt) {
  // Will be implemented in AI service
  return { status: 'pending' };
};

module.exports = mongoose.model('Proposal', proposalSchema);
