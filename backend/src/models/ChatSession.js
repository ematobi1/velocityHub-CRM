const mongoose = require('mongoose');

// AI Chatbot + 24/7 Live Agent Support (KEY FEATURE)
const chatSessionSchema = new mongoose.Schema({
  // Session ID
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  // User
  user: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String,
    // For anonymous/guest users
    isGuest: {
      type: Boolean,
      default: false
    },
    guestInfo: {
      name: String,
      email: String,
      phone: String,
      company: String
    }
  },
  // Session status
  status: {
    type: String,
    enum: ['ai_only', 'waiting_for_agent', 'agent_active', 'resolved', 'abandoned', 'transferred'],
    default: 'ai_only'
  },
  // Current handler
  handler: {
    type: {
      type: String,
      enum: ['ai', 'human'],
      default: 'ai'
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    agentName: String,
    transferredAt: Date
  },
  // Messages
  messages: [{
    id: String,
    sender: {
      type: {
        type: String,
        enum: ['user', 'ai', 'agent', 'system'],
        required: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      name: String
    },
    content: {
      text: String,
      // Rich content
      media: [{
        type: {
          type: String,
          enum: ['image', 'video', 'file', 'link']
        },
        url: String,
        filename: String,
        size: Number,
        thumbnail: String
      }],
      // Structured content (buttons, cards, etc.)
      structured: {
        type: {
          type: String,
          enum: ['quick_replies', 'carousel', 'card', 'form']
        },
        data: mongoose.Schema.Types.Mixed
      }
    },
    // AI metadata
    ai: {
      model: String,
      confidence: Number,
      intent: String,
      entities: mongoose.Schema.Types.Mixed,
      suggestedActions: [String]
    },
    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now
    },
    // Status indicators
    delivered: {
      type: Boolean,
      default: true
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: Date
  }],
  // AI Chat Context
  aiContext: {
    // User intent detected
    intent: {
      primary: String,
      confidence: Number,
      alternatives: [{
        intent: String,
        confidence: Number
      }]
    },
    // Entities extracted
    entities: mongoose.Schema.Types.Mixed,
    // Topics discussed
    topics: [String],
    // User sentiment
    sentiment: {
      current: {
        type: String,
        enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
      },
      score: Number,
      trend: String // improving, declining, stable
    },
    // Questions asked
    questions: [{
      question: String,
      answered: Boolean,
      answeredBy: String, // ai or agent
      timestamp: Date
    }],
    // Issue detected
    issue: {
      category: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      },
      resolved: Boolean
    },
    // AI confidence in handling
    aiConfidence: {
      overall: Number, // 0-100
      canHandle: Boolean,
      reasonsForEscalation: [String]
    }
  },
  // Transfer to agent
  transfer: {
    requested: Boolean,
    requestedAt: Date,
    requestedBy: {
      type: String,
      enum: ['user', 'ai_auto', 'ai_suggested']
    },
    reason: String,
    // Queue position if waiting
    queuePosition: Number,
    estimatedWaitTime: Number, // minutes
    // Agent assignment
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    acceptedAt: Date,
    // Transfer notes from AI
    aiHandoff: {
      summary: String,
      userIntent: String,
      suggestedActions: [String],
      relevantData: mongoose.Schema.Types.Mixed
    }
  },
  // Related CRM records
  relatedRecords: {
    leads: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    }],
    contacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    }],
    deals: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal'
    }],
    tickets: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket'
    }]
  },
  // Session metadata
  metadata: {
    channel: {
      type: String,
      enum: ['web_widget', 'mobile_app', 'whatsapp', 'sms', 'facebook', 'other'],
      default: 'web_widget'
    },
    device: {
      type: String,
      browser: String,
      os: String,
      userAgent: String
    },
    location: {
      ip: String,
      country: String,
      city: String,
      timezone: String
    },
    referrer: String,
    currentPage: String,
    // Session tracking
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastActivityAt: Date,
    endedAt: Date,
    duration: Number, // seconds
    // Message counts
    totalMessages: { type: Number, default: 0 },
    userMessages: { type: Number, default: 0 },
    aiMessages: { type: Number, default: 0 },
    agentMessages: { type: Number, default: 0 }
  },
  // Ratings & feedback
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date,
    // Specific ratings
    aiHelpfulness: Number,
    agentHelpfulness: Number,
    responseTime: Number,
    issueResolved: Boolean,
    // Net Promoter Score
    nps: {
      score: Number, // 0-10
      category: {
        type: String,
        enum: ['detractor', 'passive', 'promoter']
      }
    }
  },
  // AI Learning
  aiLearning: {
    // Was AI able to help?
    successful: Boolean,
    // Training data
    shouldRetrain: Boolean,
    correctedResponses: [{
      originalResponse: String,
      correctedResponse: String,
      correctedBy: String
    }],
    // Performance metrics
    averageResponseTime: Number,
    resolutionRate: Number
  },
  // Tags
  tags: [String],
  // Notes (internal, for agents)
  internalNotes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
chatSessionSchema.index({ sessionId: 1 });
chatSessionSchema.index({ 'user.userId': 1, createdAt: -1 });
chatSessionSchema.index({ 'user.email': 1 });
chatSessionSchema.index({ status: 1 });
chatSessionSchema.index({ 'handler.agentId': 1, status: 1 });
chatSessionSchema.index({ 'metadata.startedAt': -1 });

// Generate session ID
chatSessionSchema.pre('save', function(next) {
  if (this.isNew && !this.sessionId) {
    this.sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Add message to session
chatSessionSchema.methods.addMessage = function(messageData) {
  this.messages.push({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...messageData,
    timestamp: new Date()
  });

  // Update counts
  this.metadata.totalMessages++;
  if (messageData.sender.type === 'user') {
    this.metadata.userMessages++;
  } else if (messageData.sender.type === 'ai') {
    this.metadata.aiMessages++;
  } else if (messageData.sender.type === 'agent') {
    this.metadata.agentMessages++;
  }

  this.metadata.lastActivityAt = new Date();

  return this.messages[this.messages.length - 1];
};

// Request agent transfer
chatSessionSchema.methods.requestAgentTransfer = async function(reason, requestedBy = 'user') {
  this.transfer = {
    requested: true,
    requestedAt: new Date(),
    requestedBy,
    reason
  };
  this.status = 'waiting_for_agent';

  // AI generates handoff summary
  // Will be implemented in AI service

  return this;
};

// Assign to agent
chatSessionSchema.methods.assignToAgent = function(agentId, agentName) {
  this.handler = {
    type: 'human',
    agentId,
    agentName,
    transferredAt: new Date()
  };
  this.transfer.assignedAgent = agentId;
  this.transfer.assignedAt = new Date();
  this.status = 'agent_active';

  // Add system message
  this.addMessage({
    sender: {
      type: 'system'
    },
    content: {
      text: `${agentName} has joined the chat`
    }
  });

  return this;
};

// Calculate session duration
chatSessionSchema.methods.calculateDuration = function() {
  if (this.metadata.endedAt) {
    this.metadata.duration = Math.floor((this.metadata.endedAt - this.metadata.startedAt) / 1000);
  }
  return this.metadata.duration;
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);
