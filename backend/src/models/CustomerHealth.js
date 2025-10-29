const mongoose = require('mongoose');

const customerHealthSchema = new mongoose.Schema({
  // Entity Reference
  entityType: {
    type: String,
    enum: ['account', 'contact', 'lead'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },

  // Overall Health Score (0-100)
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },

  healthStatus: {
    type: String,
    enum: ['critical', 'at_risk', 'stable', 'healthy', 'excellent'],
    required: true
  },

  // Component Scores
  scores: {
    engagement: {
      score: Number,
      weight: { type: Number, default: 20 },
      metrics: {
        emailOpenRate: Number,
        clickRate: Number,
        responseRate: Number,
        meetingAttendance: Number,
        lastInteractionDays: Number
      }
    },

    product_usage: {
      score: Number,
      weight: { type: Number, default: 25 },
      metrics: {
        loginFrequency: Number,
        featureAdoption: Number,
        activeUsers: Number,
        daysActiveLast30: Number,
        averageSessionDuration: Number
      }
    },

    financial: {
      score: Number,
      weight: { type: Number, default: 20 },
      metrics: {
        revenue: Number,
        paymentStatus: String,
        invoiceHealth: Number,
        contractValue: Number,
        lifetimeValue: Number,
        paymentDelays: Number
      }
    },

    support: {
      score: Number,
      weight: { type: Number, default: 15 },
      metrics: {
        ticketCount: Number,
        avgResolutionTime: Number,
        openCriticalIssues: Number,
        satisfactionScore: Number,
        escalationRate: Number
      }
    },

    relationship: {
      score: Number,
      weight: { type: Number, default: 15 },
      metrics: {
        stakeholderCount: Number,
        championPresence: Boolean,
        executiveEngagement: Boolean,
        referralGiven: Boolean,
        npsScore: Number,
        sentimentScore: Number
      }
    },

    growth: {
      score: Number,
      weight: { type: Number, default: 5 },
      metrics: {
        expansionOpportunities: Number,
        upsellPotential: Number,
        crossSellEngagement: Number,
        renewalLikelihood: Number
      }
    }
  },

  // Risk Factors
  risks: [{
    type: {
      type: String,
      enum: [
        'low_engagement',
        'usage_decline',
        'payment_issues',
        'support_overload',
        'champion_left',
        'competitor_threat',
        'contract_expiring',
        'negative_sentiment'
      ]
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    detectedAt: Date,
    impact: Number, // -1 to -50 points
    mitigationActions: [String]
  }],

  // Opportunities
  opportunities: [{
    type: {
      type: String,
      enum: [
        'upsell',
        'cross_sell',
        'expansion',
        'referral',
        'case_study',
        'testimonial',
        'partnership'
      ]
    },
    potential: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high']
    },
    description: String,
    estimatedValue: Number,
    identifiedAt: Date,
    recommendedActions: [String]
  }],

  // Trends
  trend: {
    direction: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'critical_decline']
    },
    changePercent: Number, // change from last period
    lastPeriodScore: Number,
    consistentTrend: Boolean // true if trending same direction for 3+ periods
  },

  // Predictions
  predictions: {
    churnRisk: {
      probability: Number, // 0-100%
      confidence: Number,
      factors: [String],
      timeframe: String // '30_days', '60_days', '90_days'
    },

    expansionLikelihood: {
      probability: Number,
      estimatedValue: Number,
      confidence: Number,
      timeframe: String
    },

    nextRenewalOutcome: {
      outcome: String, // 'renew', 'downgrade', 'churn'
      confidence: Number,
      factors: [String]
    },

    lifetimeValue: {
      predicted: Number,
      current: Number,
      confidence: Number
    }
  },

  // Recommended Actions
  nextBestActions: [{
    action: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    category: String,
    reasoning: String,
    estimatedImpact: Number,
    effort: String,
    dueBy: Date
  }],

  // Historical Data Points
  history: [{
    date: Date,
    score: Number,
    status: String,
    changedComponents: [String]
  }],

  // Metadata
  lastCalculated: {
    type: Date,
    default: Date.now
  },

  calculationVersion: String,

  notes: [String]
}, {
  timestamps: true
});

// Indexes
customerHealthSchema.index({ entityType: 1, entityId: 1 });
customerHealthSchema.index({ overallScore: -1 });
customerHealthSchema.index({ healthStatus: 1 });
customerHealthSchema.index({ 'predictions.churnRisk.probability': -1 });
customerHealthSchema.index({ lastCalculated: 1 });

// Methods
customerHealthSchema.methods.calculateOverallScore = function() {
  let totalScore = 0;
  let totalWeight = 0;

  Object.keys(this.scores).forEach(component => {
    const scoreData = this.scores[component];
    if (scoreData.score !== undefined && scoreData.weight) {
      totalScore += scoreData.score * scoreData.weight;
      totalWeight += scoreData.weight;
    }
  });

  this.overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  this.healthStatus = this.getHealthStatus(this.overallScore);
};

customerHealthSchema.methods.getHealthStatus = function(score) {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'healthy';
  if (score >= 50) return 'stable';
  if (score >= 30) return 'at_risk';
  return 'critical';
};

customerHealthSchema.methods.addToHistory = function() {
  const changedComponents = [];

  if (this.history.length > 0) {
    const lastEntry = this.history[this.history.length - 1];
    Object.keys(this.scores).forEach(component => {
      if (Math.abs(this.scores[component].score - (lastEntry[component] || 0)) > 5) {
        changedComponents.push(component);
      }
    });
  }

  this.history.push({
    date: new Date(),
    score: this.overallScore,
    status: this.healthStatus,
    changedComponents
  });

  // Keep only last 90 days
  if (this.history.length > 90) {
    this.history = this.history.slice(-90);
  }
};

customerHealthSchema.methods.detectTrend = function() {
  if (this.history.length < 2) {
    this.trend = {
      direction: 'stable',
      changePercent: 0,
      consistentTrend: false
    };
    return;
  }

  const currentScore = this.overallScore;
  const lastScore = this.history[this.history.length - 2].score;
  const changePercent = ((currentScore - lastScore) / lastScore) * 100;

  let direction = 'stable';
  if (changePercent > 5) direction = 'improving';
  else if (changePercent < -5) direction = 'declining';
  else if (changePercent < -15) direction = 'critical_decline';

  // Check consistency
  let consistentTrend = false;
  if (this.history.length >= 3) {
    const last3 = this.history.slice(-3);
    const trends = [];
    for (let i = 1; i < last3.length; i++) {
      const change = last3[i].score - last3[i-1].score;
      trends.push(change > 0 ? 'up' : change < 0 ? 'down' : 'flat');
    }
    consistentTrend = trends.every(t => t === trends[0]) && trends[0] !== 'flat';
  }

  this.trend = {
    direction,
    changePercent,
    lastPeriodScore: lastScore,
    consistentTrend
  };
};

module.exports = mongoose.model('CustomerHealth', customerHealthSchema);
