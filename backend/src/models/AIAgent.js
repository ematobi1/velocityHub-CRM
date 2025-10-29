const mongoose = require('mongoose');

const aiAgentSchema = new mongoose.Schema({
  // Agent Identity
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'deal_coach',
      'customer_success',
      'churn_prevention',
      'lead_conversion',
      'support_assistant',
      'renewal_specialist',
      'cross_sell_advisor',
      'account_health_monitor',
      'pipeline_optimizer'
    ],
    required: true
  },
  description: String,

  // Agent Configuration
  capabilities: [{
    action: {
      type: String,
      enum: [
        'monitor_pipeline',
        'analyze_sentiment',
        'predict_churn',
        'suggest_actions',
        'send_notifications',
        'create_tasks',
        'update_records',
        'escalate_issues',
        'generate_content',
        'schedule_meetings',
        'analyze_patterns',
        'trigger_workflows'
      ]
    },
    enabled: {
      type: Boolean,
      default: true
    },
    config: mongoose.Schema.Types.Mixed
  }],

  // Learning & Behavior
  learningMode: {
    type: String,
    enum: ['supervised', 'reinforcement', 'autonomous'],
    default: 'supervised'
  },

  autonomyLevel: {
    type: String,
    enum: ['suggest_only', 'act_with_approval', 'fully_autonomous'],
    default: 'suggest_only'
  },

  // Monitoring Rules
  monitoringRules: [{
    entity: {
      type: String,
      enum: ['deal', 'lead', 'account', 'ticket', 'contact']
    },
    condition: {
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed
    },
    checkFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'hourly'
    }
  }],

  // Action Playbooks
  playbooks: [{
    name: String,
    trigger: {
      type: {
        type: String
      },
      description: String,
      conditions: [mongoose.Schema.Types.Mixed]
    },
    actions: [{
      type: {
        type: String,
        enum: [
          'send_email',
          'send_notification',
          'create_task',
          'update_field',
          'escalate',
          'schedule_meeting',
          'generate_proposal',
          'trigger_workflow',
          'reach_out_to_rep'
        ]
      },
      config: mongoose.Schema.Types.Mixed,
      requiresApproval: {
        type: Boolean,
        default: false
      }
    }],
    priority: {
      type: Number,
      default: 1
    }
  }],

  // AI Model Configuration
  aiModel: {
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'custom'],
      default: 'openai'
    },
    model: String,
    temperature: {
      type: Number,
      default: 0.7
    },
    maxTokens: Number,
    systemPrompt: String
  },

  // Learning Data
  trainingData: {
    type: [{
      scenario: String,
      action: String,
      outcome: String,
      feedback: {
        type: String,
        enum: ['positive', 'negative', 'neutral']
      },
      timestamp: Date
    }],
    default: []
  },

  performanceMetrics: {
    totalActions: {
      type: Number,
      default: 0
    },
    successfulActions: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    impactScore: {
      type: Number,
      default: 0
    }
  },

  // Execution History
  recentActions: {
    type: [{
      actionType: String,
      entityId: mongoose.Schema.Types.ObjectId,
      entityType: String,
      suggestion: String,
      action: mongoose.Schema.Types.Mixed,
      outcome: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'executed', 'failed']
      },
      impact: String,
      timestamp: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    default: []
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'training', 'inactive'],
    default: 'training'
  },

  // Ownership & Permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  isGlobal: {
    type: Boolean,
    default: false
  },

  // Settings
  settings: {
    notifyOnActions: {
      type: Boolean,
      default: true
    },
    dailyDigest: {
      type: Boolean,
      default: true
    },
    maxActionsPerDay: Number,
    workingHours: {
      start: String,
      end: String,
      timezone: String
    }
  }
}, {
  timestamps: true
});

// Indexes
aiAgentSchema.index({ owner: 1, status: 1 });
aiAgentSchema.index({ type: 1, status: 1 });
aiAgentSchema.index({ isGlobal: 1 });

// Methods
aiAgentSchema.methods.recordAction = function(action) {
  this.recentActions.unshift(action);
  if (this.recentActions.length > 100) {
    this.recentActions = this.recentActions.slice(0, 100);
  }

  this.performanceMetrics.totalActions++;
  if (action.outcome === 'executed') {
    this.performanceMetrics.successfulActions++;
  }

  this.performanceMetrics.successRate =
    (this.performanceMetrics.successfulActions / this.performanceMetrics.totalActions) * 100;
};

aiAgentSchema.methods.learn = function(scenario, action, outcome, feedback) {
  this.trainingData.push({
    scenario,
    action,
    outcome,
    feedback,
    timestamp: new Date()
  });

  // Keep only last 1000 training examples
  if (this.trainingData.length > 1000) {
    this.trainingData = this.trainingData.slice(-1000);
  }

  // Update impact score based on feedback
  if (feedback === 'positive') {
    this.performanceMetrics.impactScore += 5;
  } else if (feedback === 'negative') {
    this.performanceMetrics.impactScore = Math.max(0, this.performanceMetrics.impactScore - 2);
  }
};

module.exports = mongoose.model('AIAgent', aiAgentSchema);
