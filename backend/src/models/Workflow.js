const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true
  },
  description: String,

  // Target entity
  entity: {
    type: String,
    enum: ['lead', 'contact', 'deal', 'task', 'company'],
    required: true
  },

  // Trigger configuration
  trigger: {
    type: {
      type: String,
      enum: [
        'field_updated',
        'record_created',
        'record_updated',
        'stage_changed',
        'score_threshold',
        'time_based',
        'inactivity',
        'tag_added',
        'tag_removed',
        'email_opened',
        'email_clicked',
        'form_submitted',
        'deal_won',
        'deal_lost'
      ],
      required: true
    },

    // Trigger conditions
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'changed_to', 'changed_from']
      },
      value: mongoose.Schema.Types.Mixed
    }],

    // Time-based trigger settings
    schedule: {
      frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly']
      },
      time: String, // HH:MM format
      dayOfWeek: Number, // 0-6 for weekly
      dayOfMonth: Number, // 1-31 for monthly
      timezone: String
    },

    // Inactivity settings
    inactivityDays: Number
  },

  // Filter criteria (additional filtering beyond trigger)
  filters: [{
    field: String,
    operator: String,
    value: mongoose.Schema.Types.Mixed,
    logicalOperator: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND'
    }
  }],

  // Actions to perform
  actions: [{
    type: {
      type: String,
      enum: [
        'update_field',
        'send_email',
        'send_sms',
        'create_task',
        'create_deal',
        'add_tag',
        'remove_tag',
        'assign_owner',
        'change_stage',
        'update_score',
        'create_activity',
        'send_notification',
        'webhook',
        'add_to_sequence',
        'remove_from_sequence',
        'create_note',
        'wait'
      ],
      required: true
    },

    // Action configuration
    config: {
      // Field updates
      field: String,
      value: mongoose.Schema.Types.Mixed,

      // Email/SMS
      template: String,
      subject: String,
      body: String,
      recipient: String, // 'owner', 'lead_email', 'custom'
      customRecipient: String,

      // Task creation
      taskTitle: String,
      taskDescription: String,
      taskDueDate: {
        type: String, // 'immediate', 'in_1_day', 'in_3_days', 'in_1_week', 'custom'
      },
      taskPriority: String,
      assignTo: String, // 'owner', 'specific_user', 'round_robin'
      specificUser: mongoose.Schema.Types.ObjectId,

      // Deal creation
      dealName: String,
      dealValue: Number,
      dealStage: String,

      // Tags
      tags: [String],

      // Owner assignment
      assignmentType: String, // 'specific', 'round_robin', 'least_loaded', 'by_territory'
      ownerId: mongoose.Schema.Types.ObjectId,
      territory: String,

      // Stage change
      newStage: String,

      // Score update
      scoreChange: Number, // +10, -5, etc.

      // Notification
      notificationMessage: String,
      notifyUsers: [mongoose.Schema.Types.ObjectId],

      // Webhook
      webhookUrl: String,
      webhookMethod: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH']
      },
      webhookHeaders: mongoose.Schema.Types.Mixed,
      webhookBody: mongoose.Schema.Types.Mixed,

      // Email sequence
      sequenceId: mongoose.Schema.Types.ObjectId,

      // Note
      noteContent: String,

      // Wait action
      waitDuration: Number, // in minutes
      waitUnit: {
        type: String,
        enum: ['minutes', 'hours', 'days']
      }
    },

    // Action ordering
    order: {
      type: Number,
      default: 0
    },

    // Conditional action (only run if condition met)
    condition: {
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed
    }
  }],

  // Workflow settings
  settings: {
    // Run once or multiple times per record
    runOnce: {
      type: Boolean,
      default: false
    },

    // Re-enrollment settings
    allowReenrollment: {
      type: Boolean,
      default: false
    },
    reenrollmentDelay: Number, // days

    // Execution limits
    dailyLimit: Number,
    totalLimit: Number,

    // Active hours
    activeHours: {
      start: String, // HH:MM
      end: String, // HH:MM
      timezone: String
    },

    // Days of week to run
    activeDays: [Number], // 0-6

    // Stop conditions
    stopOn: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed
    }]
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft'
  },

  // Ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Statistics
  stats: {
    totalExecutions: {
      type: Number,
      default: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0
    },
    failedExecutions: {
      type: Number,
      default: 0
    },
    lastExecuted: Date,
    averageExecutionTime: Number // milliseconds
  },

  // Execution history (limited)
  recentExecutions: [{
    recordId: mongoose.Schema.Types.ObjectId,
    recordType: String,
    executedAt: Date,
    status: {
      type: String,
      enum: ['success', 'failed', 'partial']
    },
    actionsCompleted: Number,
    actionsFailed: Number,
    error: String,
    executionTime: Number
  }]
}, {
  timestamps: true
});

// Indexes
workflowSchema.index({ entity: 1, status: 1 });
workflowSchema.index({ createdBy: 1 });
workflowSchema.index({ 'trigger.type': 1, status: 1 });
workflowSchema.index({ status: 1, 'stats.lastExecuted': -1 });

// Methods
workflowSchema.methods.incrementStats = function(success, executionTime) {
  this.stats.totalExecutions++;
  if (success) {
    this.stats.successfulExecutions++;
  } else {
    this.stats.failedExecutions++;
  }
  this.stats.lastExecuted = new Date();

  // Update average execution time
  if (this.stats.averageExecutionTime) {
    this.stats.averageExecutionTime =
      (this.stats.averageExecutionTime + executionTime) / 2;
  } else {
    this.stats.averageExecutionTime = executionTime;
  }
};

workflowSchema.methods.addExecution = function(execution) {
  this.recentExecutions.unshift(execution);

  // Keep only last 50 executions
  if (this.recentExecutions.length > 50) {
    this.recentExecutions = this.recentExecutions.slice(0, 50);
  }
};

workflowSchema.methods.canExecute = function() {
  // Check if workflow is active
  if (this.status !== 'active') return false;

  // Check daily limit
  if (this.settings.dailyLimit) {
    const today = new Date().toDateString();
    const todayExecutions = this.recentExecutions.filter(
      e => new Date(e.executedAt).toDateString() === today
    ).length;

    if (todayExecutions >= this.settings.dailyLimit) return false;
  }

  // Check total limit
  if (this.settings.totalLimit && this.stats.totalExecutions >= this.settings.totalLimit) {
    return false;
  }

  // Check active hours
  if (this.settings.activeHours && this.settings.activeHours.start) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = this.settings.activeHours.start.split(':');
    const startTime = parseInt(startHour) * 60 + parseInt(startMinute);

    const [endHour, endMinute] = this.settings.activeHours.end.split(':');
    const endTime = parseInt(endHour) * 60 + parseInt(endMinute);

    if (currentTime < startTime || currentTime > endTime) return false;
  }

  // Check active days
  if (this.settings.activeDays && this.settings.activeDays.length > 0) {
    const currentDay = new Date().getDay();
    if (!this.settings.activeDays.includes(currentDay)) return false;
  }

  return true;
};

module.exports = mongoose.model('Workflow', workflowSchema);
