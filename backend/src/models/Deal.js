const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  // Pipeline stage
  stage: {
    type: String,
    enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    default: 'prospecting'
  },
  // Relationships
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Deal details
  closeDate: {
    type: Date,
    required: true
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 10
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'cold_call', 'email', 'social_media', 'event', 'partner', 'other'],
    default: 'other'
  },
  description: String,
  // AI Predictive Intelligence (KEY DIFFERENTIATOR)
  aiInsights: {
    // AI-predicted close probability (0-100)
    predictedProbability: {
      type: Number,
      min: 0,
      max: 100
    },
    // Confidence in the prediction (0-100)
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    // Revenue forecast range
    forecastedRevenue: {
      low: Number,
      expected: Number,
      high: Number
    },
    // Days until expected close
    expectedDaysToClose: Number,
    // Risk factors
    riskFactors: [{
      factor: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String
    }],
    // Positive signals
    positiveSignals: [{
      signal: String,
      strength: {
        type: String,
        enum: ['weak', 'moderate', 'strong']
      },
      description: String
    }],
    // Next best action recommendations
    recommendedActions: [{
      action: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      },
      reason: String,
      estimatedImpact: String // e.g., "+15% close probability"
    }],
    // Similar deals analysis
    similarDeals: {
      wonCount: Number,
      lostCount: Number,
      avgDaysToClose: Number,
      avgValue: Number
    },
    // Engagement score (based on interactions)
    engagementScore: {
      type: Number,
      min: 0,
      max: 100
    },
    // Last AI analysis date
    lastAnalyzed: {
      type: Date,
      default: Date.now
    },
    // AI model version used
    modelVersion: String
  },
  // Activity tracking
  activities: [{
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'note', 'task', 'proposal_sent', 'contract_sent']
    },
    description: String,
    date: Date,
    duration: Number, // in minutes
    outcome: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // Deal metrics
  metrics: {
    emailsSent: { type: Number, default: 0 },
    emailsOpened: { type: Number, default: 0 },
    callsMade: { type: Number, default: 0 },
    meetingsHeld: { type: Number, default: 0 },
    proposalsSent: { type: Number, default: 0 },
    proposalsViewed: { type: Number, default: 0 },
    daysInStage: Number,
    lastContactDate: Date,
    daysSinceLastContact: Number
  },
  // Products/Services
  products: [{
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  // Competition
  competitors: [{
    name: String,
    strength: {
      type: String,
      enum: ['weak', 'moderate', 'strong']
    },
    notes: String
  }],
  // Decision makers
  decisionMakers: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    role: String,
    influence: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    sentiment: {
      type: String,
      enum: ['negative', 'neutral', 'positive', 'champion']
    }
  }],
  // Contract & Proposal
  proposal: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal'
    },
    sentDate: Date,
    viewedDate: Date,
    viewCount: Number,
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'declined']
    }
  },
  contract: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    },
    sentDate: Date,
    signedDate: Date,
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'signed', 'declined']
    }
  },
  // Lost deal info
  lostReason: String,
  lostTo: String, // competitor name
  lostNotes: String,
  // Tags
  tags: [String],
  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,
  // System fields
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  wonAt: Date,
  lostAt: Date
}, {
  timestamps: true
});

// Indexes for performance
dealSchema.index({ owner: 1, stage: 1 });
dealSchema.index({ closeDate: 1 });
dealSchema.index({ 'aiInsights.predictedProbability': -1 });
dealSchema.index({ contact: 1 });
dealSchema.index({ company: 1 });
dealSchema.index({ createdAt: -1 });

// Calculate weighted value (value * probability)
dealSchema.virtual('weightedValue').get(function() {
  return (this.value * (this.aiInsights?.predictedProbability || this.probability)) / 100;
});

// Calculate days in current stage
dealSchema.methods.updateDaysInStage = function() {
  // This would track stage changes via a separate StageHistory collection
  // For now, simplified calculation
  const now = new Date();
  const daysSinceUpdate = Math.floor((now - this.updatedAt) / (1000 * 60 * 60 * 24));
  this.metrics.daysInStage = daysSinceUpdate;
};

// Calculate days since last contact
dealSchema.methods.updateDaysSinceLastContact = function() {
  if (this.metrics.lastContactDate) {
    const now = new Date();
    this.metrics.daysSinceLastContact = Math.floor((now - this.metrics.lastContactDate) / (1000 * 60 * 60 * 24));
  }
};

// Trigger AI analysis (will be implemented in AI service)
dealSchema.methods.requestAIAnalysis = async function() {
  // This will call the AI service to generate predictions
  // Placeholder for now
  return { status: 'pending' };
};

module.exports = mongoose.model('Deal', dealSchema);
