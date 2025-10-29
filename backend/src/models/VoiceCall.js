const mongoose = require('mongoose');

// Voice AI - Real-time call transcription & analysis (KEY DIFFERENTIATOR)
const voiceCallSchema = new mongoose.Schema({
  // Call details
  callId: {
    type: String,
    required: true,
    unique: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy'],
    default: 'initiated'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startTime: Date,
  endTime: Date,
  // Participants
  caller: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    phone: String
  },
  recipient: {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    phone: String,
    name: String
  },
  // Related records
  relatedDeal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  relatedCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  // Recording
  recording: {
    url: String,
    duration: Number,
    size: Number, // in bytes
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  },
  // AI Transcription (REAL-TIME)
  transcription: {
    full: String, // Complete transcript
    segments: [{
      speaker: {
        type: String,
        enum: ['agent', 'customer']
      },
      text: String,
      startTime: Number, // seconds from call start
      endTime: Number,
      confidence: Number // 0-100
    }],
    language: {
      type: String,
      default: 'en'
    },
    keywords: [String] // Important keywords mentioned
  },
  // AI Analysis (GAME-CHANGER FEATURE)
  aiAnalysis: {
    // Overall sentiment
    sentiment: {
      overall: {
        type: String,
        enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
      },
      score: {
        type: Number,
        min: -100,
        max: 100
      },
      // Sentiment over time
      timeline: [{
        timestamp: Number, // seconds
        score: Number,
        label: String
      }]
    },
    // Customer engagement
    engagement: {
      level: {
        type: String,
        enum: ['very_low', 'low', 'medium', 'high', 'very_high']
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      indicators: [{
        type: String,
        description: String,
        timestamp: Number
      }]
    },
    // Talk ratio
    talkRatio: {
      agent: Number, // percentage
      customer: Number // percentage
    },
    // Speaking pace
    pace: {
      agent: Number, // words per minute
      customer: Number,
      assessment: String // e.g., "too fast", "good", "slow"
    },
    // Objections detected
    objections: [{
      type: {
        type: String,
        enum: ['price', 'timing', 'competition', 'authority', 'need', 'other']
      },
      text: String,
      timestamp: Number,
      handled: Boolean,
      agentResponse: String
    }],
    // Buying signals
    buyingSignals: [{
      signal: String,
      strength: {
        type: String,
        enum: ['weak', 'moderate', 'strong']
      },
      timestamp: Number,
      context: String
    }],
    // Questions asked
    questions: {
      byCustomer: [{
        question: String,
        timestamp: Number,
        answered: Boolean
      }],
      byAgent: [{
        question: String,
        timestamp: Number,
        type: String // open-ended, closed, discovery, etc.
      }]
    },
    // Key topics discussed
    topics: [{
      topic: String,
      relevance: Number, // 0-100
      duration: Number, // seconds spent on topic
      sentiment: String
    }],
    // Next steps mentioned
    nextSteps: [{
      action: String,
      mentionedBy: {
        type: String,
        enum: ['agent', 'customer']
      },
      agreedUpon: Boolean,
      deadline: String
    }],
    // Call outcome prediction
    outcome: {
      predicted: {
        type: String,
        enum: ['will_close', 'needs_nurturing', 'likely_lost', 'not_interested']
      },
      confidence: Number, // 0-100
      reasoning: String
    },
    // Coaching insights (UNIQUE VALUE)
    coaching: {
      strengths: [{
        aspect: String,
        description: String,
        example: String
      }],
      improvements: [{
        aspect: String,
        description: String,
        suggestion: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high']
        }
      }],
      overallScore: Number, // 0-100
      competitiveScore: Number // vs team average
    },
    // Automated follow-up suggestions
    followUp: {
      recommended: Boolean,
      timing: String, // e.g., "within 24 hours"
      channel: {
        type: String,
        enum: ['email', 'call', 'sms', 'whatsapp', 'meeting']
      },
      suggestedMessage: String,
      suggestedSubject: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      }
    },
    // AI analysis metadata
    analyzedAt: Date,
    modelVersion: String,
    processingTime: Number // milliseconds
  },
  // Manual notes
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
  // Call outcome (manual)
  outcome: {
    result: {
      type: String,
      enum: ['successful', 'no_answer', 'left_voicemail', 'callback_requested', 'not_interested', 'wrong_number', 'other']
    },
    notes: String,
    followUpScheduled: Boolean,
    followUpDate: Date
  },
  // Cost tracking (for billing)
  cost: {
    duration: Number, // billable minutes
    rate: Number, // per minute
    total: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  // Tags
  tags: [String]
}, {
  timestamps: true
});

// Indexes
voiceCallSchema.index({ 'caller.userId': 1, createdAt: -1 });
voiceCallSchema.index({ 'recipient.contactId': 1 });
voiceCallSchema.index({ 'recipient.leadId': 1 });
voiceCallSchema.index({ relatedDeal: 1 });
voiceCallSchema.index({ status: 1 });
voiceCallSchema.index({ callId: 1 });

// Method to calculate cost
voiceCallSchema.methods.calculateCost = function(ratePerMinute = 0.10) {
  const minutes = Math.ceil(this.duration / 60);
  this.cost = {
    duration: minutes,
    rate: ratePerMinute,
    total: minutes * ratePerMinute,
    currency: 'USD'
  };
  return this.cost;
};

// Method to request AI analysis
voiceCallSchema.methods.requestAIAnalysis = async function() {
  // Will be implemented in AI service
  return { status: 'pending' };
};

module.exports = mongoose.model('VoiceCall', voiceCallSchema);
