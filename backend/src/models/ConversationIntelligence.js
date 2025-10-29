const mongoose = require('mongoose');

const conversationIntelligenceSchema = new mongoose.Schema({
  // Reference to conversation
  conversationType: {
    type: String,
    enum: ['call', 'email', 'message', 'meeting'],
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'conversationType'
  },

  // Associated records
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  },
  deal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // AI Analysis Results
  transcript: {
    type: String,
    required: true
  },

  sentiment: {
    overall: {
      type: String,
      enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
    },
    score: {
      type: Number,
      min: -1,
      max: 1
    },
    confidence: Number
  },

  // Key Insights
  insights: [{
    type: {
      type: String,
      enum: ['pain_point', 'objection', 'buying_signal', 'competitor_mention', 'budget_discussion', 'timeline', 'decision_maker']
    },
    content: String,
    timestamp: Number, // Position in conversation
    confidence: Number
  }],

  // Action Items
  actionItems: [{
    description: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],

  // Topics & Keywords
  topics: [{
    topic: String,
    relevance: Number, // 0-1
    mentions: Number
  }],

  keywords: [{
    word: String,
    frequency: Number,
    sentiment: String
  }],

  // Questions & Answers
  questions: [{
    question: String,
    answer: String,
    timestamp: Number,
    askedBy: {
      type: String,
      enum: ['rep', 'customer']
    }
  }],

  // Talk Statistics
  talkRatio: {
    repPercentage: Number,
    customerPercentage: Number
  },

  interruptionCount: Number,

  talkSpeed: {
    rep: Number, // words per minute
    customer: Number
  },

  // Competitor Intelligence
  competitorsDiscussed: [{
    name: String,
    context: String,
    sentiment: String,
    timestamp: Number
  }],

  // Deal Signals
  dealSignals: {
    buyingIntent: {
      score: Number, // 0-100
      signals: [String]
    },
    urgency: {
      score: Number, // 0-100
      indicators: [String]
    },
    budget: {
      mentioned: Boolean,
      range: String,
      concerns: [String]
    },
    decisionProcess: {
      stage: String,
      stakeholders: [String],
      timeline: String
    }
  },

  // Risk Factors
  risks: [{
    type: {
      type: String,
      enum: ['objection', 'competitor_threat', 'budget_concern', 'timing_issue', 'decision_maker_not_engaged']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    mitigation: String
  }],

  // Coaching Recommendations
  coachingTips: [{
    category: {
      type: String,
      enum: ['discovery', 'objection_handling', 'closing', 'rapport_building', 'active_listening']
    },
    recommendation: String,
    example: String,
    priority: Number
  }],

  // Summary
  summary: {
    brief: String, // 2-3 sentences
    detailed: String, // Full summary
    nextSteps: [String],
    keyTakeaways: [String]
  },

  // Metadata
  duration: Number, // in seconds
  participantCount: Number,
  language: {
    type: String,
    default: 'en'
  },

  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },

  processingError: String,

  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  },

  // Timestamps
  conversationDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
conversationIntelligenceSchema.index({ conversationId: 1, conversationType: 1 });
conversationIntelligenceSchema.index({ user: 1, conversationDate: -1 });
conversationIntelligenceSchema.index({ lead: 1 });
conversationIntelligenceSchema.index({ contact: 1 });
conversationIntelligenceSchema.index({ deal: 1 });
conversationIntelligenceSchema.index({ 'sentiment.overall': 1 });
conversationIntelligenceSchema.index({ 'dealSignals.buyingIntent.score': -1 });

module.exports = mongoose.model('ConversationIntelligence', conversationIntelligenceSchema);
