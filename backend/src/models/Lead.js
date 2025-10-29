const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Basic info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: String,
  // Company info
  company: String,
  jobTitle: String,
  website: String,
  industry: String,
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  // Lead details
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'],
    default: 'new'
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'cold_call', 'email', 'social_media', 'event', 'partner', 'other'],
    default: 'other'
  },
  // AI Lead Scoring (KEY DIFFERENTIATOR)
  aiScore: {
    overall: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    // Individual score components
    engagement: { type: Number, min: 0, max: 100 },
    fit: { type: Number, min: 0, max: 100 },
    intent: { type: Number, min: 0, max: 100 },
    timing: { type: Number, min: 0, max: 100 },
    // AI-generated insights
    insights: {
      buyingSignals: [String],
      concerns: [String],
      nextBestAction: String,
      expectedResponseTime: String,
      recommendedApproach: String
    },
    lastScored: {
      type: Date,
      default: Date.now
    }
  },
  // Assignment
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Lead value estimation
  estimatedValue: {
    type: Number,
    min: 0
  },
  // Engagement tracking
  engagement: {
    emailsOpened: { type: Number, default: 0 },
    emailsClicked: { type: Number, default: 0 },
    websiteVisits: { type: Number, default: 0 },
    lastEmailOpened: Date,
    lastWebsiteVisit: Date,
    lastContacted: Date
  },
  // Notes and description
  description: String,
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
  // Tags
  tags: [String],
  // Social media
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,
  // Conversion
  convertedToDeal: {
    type: Boolean,
    default: false
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  convertedAt: Date,
  // Qualification criteria
  qualificationCriteria: {
    budget: Boolean,
    authority: Boolean,
    need: Boolean,
    timeline: Boolean
  },
  // System fields
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes
leadSchema.index({ email: 1 });
leadSchema.index({ owner: 1, status: 1 });
leadSchema.index({ 'aiScore.overall': -1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ source: 1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to update AI score
leadSchema.methods.updateAIScore = async function() {
  // Placeholder - will be implemented in AI service
  return { status: 'pending' };
};

module.exports = mongoose.model('Lead', leadSchema);
