const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['call', 'email', 'meeting', 'follow_up', 'demo', 'proposal', 'contract', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Related records
  relatedTo: {
    type: {
      type: String,
      enum: ['lead', 'contact', 'deal', 'company']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.type'
    }
  },
  // Completion
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  outcome: String,
  // Reminder
  reminder: {
    enabled: { type: Boolean, default: false },
    time: Date,
    sent: { type: Boolean, default: false }
  },
  // Tags
  tags: [String],
  // System fields
  isOverdue: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ 'relatedTo.id': 1 });
taskSchema.index({ priority: 1 });

// Check if task is overdue
taskSchema.pre('save', function(next) {
  if (this.status !== 'completed' && this.dueDate < new Date()) {
    this.isOverdue = true;
  } else {
    this.isOverdue = false;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
