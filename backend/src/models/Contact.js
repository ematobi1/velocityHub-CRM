const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
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
  mobile: String,
  // Company relationship
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  jobTitle: String,
  department: String,
  // Contact details
  status: {
    type: String,
    enum: ['active', 'inactive', 'do_not_contact'],
    default: 'active'
  },
  // Decision maker info
  decisionMaker: {
    isDecisionMaker: {
      type: Boolean,
      default: false
    },
    influence: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    role: {
      type: String,
      enum: ['user', 'influencer', 'decision_maker', 'champion', 'blocker']
    }
  },
  // Owner
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
  // Communication preferences
  preferences: {
    emailOptIn: { type: Boolean, default: true },
    smsOptIn: { type: Boolean, default: false },
    whatsappOptIn: { type: Boolean, default: false },
    preferredChannel: {
      type: String,
      enum: ['email', 'phone', 'sms', 'whatsapp', 'linkedin'],
      default: 'email'
    },
    preferredTime: String,
    timezone: String
  },
  // Engagement tracking
  engagement: {
    lastContacted: Date,
    lastEmailOpened: Date,
    lastEmailClicked: Date,
    lastMeeting: Date,
    emailsSent: { type: Number, default: 0 },
    emailsOpened: { type: Number, default: 0 },
    callsMade: { type: Number, default: 0 },
    meetingsHeld: { type: Number, default: 0 },
    // AI Sentiment Analysis
    overallSentiment: {
      type: String,
      enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  // Social media
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String
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
  // Tags
  tags: [String],
  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,
  // Related deals
  deals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  }],
  // Lead source
  leadSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  // Birthday/Anniversary
  birthday: Date,
  anniversary: Date,
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
contactSchema.index({ email: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ owner: 1 });
contactSchema.index({ createdAt: -1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Contact', contactSchema);
