const mongoose = require('mongoose');

// AI Outreach Engine - Multi-channel sequences (KEY DIFFERENTIATOR)
const emailSequenceSchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft'
  },
  // Sequence steps
  steps: [{
    order: Number,
    type: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'linkedin', 'call_task', 'wait'],
      required: true
    },
    // Timing
    delay: {
      value: Number,
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'weeks']
      }
    },
    // Content
    subject: String, // for email
    body: String,
    // AI Personalization (GAME-CHANGER)
    aiPersonalization: {
      enabled: {
        type: Boolean,
        default: true
      },
      // Variables to personalize
      variables: [{
        name: String, // e.g., {{firstName}}, {{company}}, {{painPoint}}
        source: String, // lead field, company field, or AI-generated
        aiGenerated: Boolean
      }],
      // AI learns from best performers
      basedOn: [{
        emailId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Email'
        },
        performance: Number // open rate, reply rate
      }],
      // A/B test variations
      variations: [{
        name: String,
        subject: String,
        body: String,
        weight: Number, // percentage
        performance: {
          sent: Number,
          opened: Number,
          clicked: Number,
          replied: Number
        }
      }]
    },
    // Conditional logic
    conditions: [{
      type: {
        type: String,
        enum: ['opened', 'not_opened', 'clicked', 'replied', 'not_replied', 'custom_field']
      },
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
      action: {
        type: String,
        enum: ['continue', 'stop', 'goto_step', 'add_tag', 'change_status']
      },
      actionValue: mongoose.Schema.Types.Mixed
    }],
    // Media attachments
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    // Task creation (for call_task type)
    task: {
      title: String,
      description: String,
      priority: String
    }
  }],
  // Enrollment
  enrollment: {
    // Who gets enrolled
    criteria: {
      leadStatus: [String],
      leadSource: [String],
      aiScore: {
        min: Number,
        max: Number
      },
      tags: [String],
      customFilters: mongoose.Schema.Types.Mixed
    },
    // Enrollment settings
    autoEnroll: {
      type: Boolean,
      default: false
    },
    maxEnrollments: Number,
    // Exit criteria
    exitOn: [{
      condition: String,
      value: mongoose.Schema.Types.Mixed
    }]
  },
  // Performance tracking
  performance: {
    enrolled: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    // Email metrics
    emailsSent: { type: Number, default: 0 },
    emailsOpened: { type: Number, default: 0 },
    emailsClicked: { type: Number, default: 0 },
    emailsReplied: { type: Number, default: 0 },
    emailsBounced: { type: Number, default: 0 },
    // Conversion metrics
    leadsConverted: { type: Number, default: 0 },
    dealsCreated: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    // Calculated rates
    openRate: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    replyRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  // AI Optimization (UNIQUE VALUE)
  aiOptimization: {
    enabled: {
      type: Boolean,
      default: true
    },
    // AI automatically tests and optimizes
    autoOptimize: {
      type: Boolean,
      default: false
    },
    // What to optimize
    optimizeFor: {
      type: String,
      enum: ['open_rate', 'click_rate', 'reply_rate', 'conversion_rate'],
      default: 'reply_rate'
    },
    // Optimization history
    experiments: [{
      startDate: Date,
      endDate: Date,
      hypothesis: String,
      changes: [{
        step: Number,
        field: String,
        oldValue: String,
        newValue: String
      }],
      results: {
        improvement: Number, // percentage
        significant: Boolean,
        implemented: Boolean
      }
    }],
    // AI insights
    insights: [{
      type: {
        type: String,
        enum: ['timing', 'content', 'subject', 'length', 'tone', 'cta']
      },
      insight: String,
      recommendation: String,
      estimatedImpact: String,
      implementedAt: Date
    }],
    lastOptimized: Date
  },
  // Settings
  settings: {
    sendingSchedule: {
      days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
      timeStart: String, // HH:MM
      timeEnd: String,
      timezone: String
    },
    respectUnsubscribes: {
      type: Boolean,
      default: true
    },
    respectDoNotContact: {
      type: Boolean,
      default: true
    },
    throttling: {
      maxPerDay: Number,
      maxPerHour: Number
    }
  },
  // Owner
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Tags
  tags: [String]
}, {
  timestamps: true
});

// Indexes
emailSequenceSchema.index({ createdBy: 1 });
emailSequenceSchema.index({ status: 1 });
emailSequenceSchema.index({ createdAt: -1 });

// Calculate performance rates
emailSequenceSchema.methods.calculateRates = function() {
  if (this.performance.emailsSent > 0) {
    this.performance.openRate = (this.performance.emailsOpened / this.performance.emailsSent) * 100;
    this.performance.clickRate = (this.performance.emailsClicked / this.performance.emailsSent) * 100;
    this.performance.replyRate = (this.performance.emailsReplied / this.performance.emailsSent) * 100;
  }

  if (this.performance.enrolled > 0) {
    this.performance.conversionRate = (this.performance.leadsConverted / this.performance.enrolled) * 100;
  }

  return this.performance;
};

// Request AI optimization
emailSequenceSchema.methods.requestAIOptimization = async function() {
  // Will be implemented in AI service
  return { status: 'pending' };
};

module.exports = mongoose.model('EmailSequence', emailSequenceSchema);
