const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'sales_rep', 'support'],
      default: 'sales_rep',
    },
    // Subscription & Pricing
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'cancelled', 'past_due', 'trialing'],
        default: 'active',
      },
      startDate: Date,
      endDate: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
    },
    // Usage tracking for pay-as-you-go
    usage: {
      voiceMinutes: { type: Number, default: 0 },
      messagesCount: { type: Number, default: 0 },
      aiEmailsCount: { type: Number, default: 0 },
      proposalsCount: { type: Number, default: 0 },
      // Reset monthly
      lastResetDate: { type: Date, default: Date.now },
    },
    // Limits based on subscription
    limits: {
      contacts: { type: Number, default: 1000 }, // Free: 1000, Pro/Enterprise: Unlimited (-1)
      users: { type: Number, default: 1 },
      voiceMinutes: { type: Number, default: 0 }, // Free: 0, Pro: 300, Enterprise: -1 (unlimited)
      messages: { type: Number, default: 0 }, // Free: 0, Pro: 500, Enterprise: -1
      aiEmails: { type: Number, default: 0 }, // Free: 0, Pro: 100, Enterprise: -1
      proposals: { type: Number, default: 0 }, // Free: 0, Pro: 10, Enterprise: -1
    },
    // Profile
    phone: String,
    avatar: String,
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    // Activity tracking
    lastActive: Date,
    lastLogin: Date,
    isOnline: {
      type: Boolean,
      default: false,
    },
    // Company/Team
    company: {
      name: String,
      size: String,
      industry: String,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    // Preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      language: { type: String, default: 'en' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      timeFormat: { type: String, default: '12h' },
    },
    // Onboarding
    onboarding: {
      completed: { type: Boolean, default: false },
      currentStep: { type: Number, default: 0 },
      completedSteps: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update subscription limits based on tier
userSchema.methods.updateLimits = function () {
  const tier = this.subscription.tier;

  if (tier === 'free') {
    this.limits = {
      contacts: 1000,
      users: 1,
      voiceMinutes: 0,
      messages: 0,
      aiEmails: 0,
      proposals: 0,
    };
  } else if (tier === 'pro') {
    this.limits = {
      contacts: -1, // unlimited
      users: 10,
      voiceMinutes: 300, // 5 hours
      messages: 500,
      aiEmails: 100,
      proposals: 10,
    };
  } else if (tier === 'enterprise') {
    this.limits = {
      contacts: -1,
      users: -1,
      voiceMinutes: -1,
      messages: -1,
      aiEmails: -1,
      proposals: -1,
    };
  }
};

// Check if user has exceeded limits
userSchema.methods.hasExceededLimit = function (feature) {
  const limit = this.limits[feature];
  const usage =
    this.usage[
      feature +
        (feature === 'voice'
          ? 'Minutes'
          : feature === 'messages' || feature === 'aiEmails' || feature === 'proposals'
            ? 'Count'
            : '')
    ];

  if (limit === -1) return false; // unlimited
  return usage >= limit;
};

// Reset monthly usage
userSchema.methods.resetMonthlyUsage = function () {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage = {
      voiceMinutes: 0,
      messagesCount: 0,
      aiEmailsCount: 0,
      proposalsCount: 0,
      lastResetDate: now,
    };
  }
};

module.exports = mongoose.model('User', userSchema);
