const mongoose = require('mongoose');

const socialProfileSchema = new mongoose.Schema({
  // Associated CRM records
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },

  // Platform information
  platform: {
    type: String,
    enum: ['linkedin', 'twitter', 'facebook', 'instagram'],
    required: true
  },

  profileId: {
    type: String,
    required: true
  },

  profileUrl: {
    type: String,
    required: true
  },

  // Profile Data
  displayName: String,
  username: String,
  headline: String,
  bio: String,
  location: String,
  profilePicture: String,
  coverImage: String,

  // LinkedIn specific
  linkedin: {
    position: String,
    company: String,
    industry: String,
    connectionDegree: {
      type: String,
      enum: ['1st', '2nd', '3rd', '3rd+']
    },
    mutualConnections: Number,
    skills: [String],
    endorsements: Number,
    recommendations: Number,
    publicIdentifier: String
  },

  // Twitter specific
  twitter: {
    followerCount: Number,
    followingCount: Number,
    tweetCount: Number,
    verified: Boolean,
    bio: String,
    website: String
  },

  // Activity metrics
  engagement: {
    lastActive: Date,
    postFrequency: {
      type: String,
      enum: ['very_active', 'active', 'moderate', 'low', 'inactive']
    },
    avgLikes: Number,
    avgComments: Number,
    avgShares: Number,
    engagementRate: Number
  },

  // Recent posts/activity
  recentActivity: [{
    type: {
      type: String,
      enum: ['post', 'comment', 'share', 'like', 'job_change', 'milestone']
    },
    content: String,
    url: String,
    date: Date,
    likes: Number,
    comments: Number,
    shares: Number
  }],

  // Interaction history
  interactions: [{
    type: {
      type: String,
      enum: ['message_sent', 'connection_request', 'post_liked', 'post_commented', 'post_shared', 'profile_viewed']
    },
    date: Date,
    note: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Signals & Insights
  signals: [{
    type: {
      type: String,
      enum: ['job_change', 'promotion', 'company_change', 'milestone', 'hiring', 'active_posting', 'engagement_spike']
    },
    description: String,
    date: Date,
    relevance: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],

  // Enrichment data
  enrichmentData: {
    email: String,
    phone: String,
    alternateEmails: [String],
    workHistory: [{
      company: String,
      title: String,
      startDate: Date,
      endDate: Date,
      current: Boolean
    }],
    education: [{
      school: String,
      degree: String,
      field: String,
      startYear: Number,
      endYear: Number
    }],
    interests: [String],
    groups: [String]
  },

  // Sync settings
  autoSync: {
    type: Boolean,
    default: true
  },
  lastSynced: Date,
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'success', 'failed'],
    default: 'pending'
  },
  syncError: String,

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
socialProfileSchema.index({ platform: 1, profileId: 1 }, { unique: true });
socialProfileSchema.index({ lead: 1 });
socialProfileSchema.index({ contact: 1 });
socialProfileSchema.index({ company: 1 });
socialProfileSchema.index({ platform: 1, username: 1 });

// Methods
socialProfileSchema.methods.calculateEngagementScore = function() {
  const engagement = this.engagement;

  if (!engagement || !engagement.avgLikes) return 0;

  let score = 0;

  // Activity frequency
  switch (engagement.postFrequency) {
    case 'very_active': score += 30; break;
    case 'active': score += 25; break;
    case 'moderate': score += 15; break;
    case 'low': score += 5; break;
  }

  // Engagement rate
  if (engagement.engagementRate > 5) score += 30;
  else if (engagement.engagementRate > 3) score += 20;
  else if (engagement.engagementRate > 1) score += 10;

  // Recent activity
  const daysSinceActive = this.engagement.lastActive
    ? (Date.now() - this.engagement.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  if (daysSinceActive < 1) score += 20;
  else if (daysSinceActive < 7) score += 15;
  else if (daysSinceActive < 30) score += 10;

  // Signals
  const recentSignals = this.signals.filter(s => {
    const daysSince = (Date.now() - s.date.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 30;
  });
  score += Math.min(recentSignals.length * 5, 20);

  return Math.min(score, 100);
};

socialProfileSchema.methods.addInteraction = function(interactionType, note, userId) {
  this.interactions.push({
    type: interactionType,
    date: new Date(),
    note,
    user: userId
  });

  // Keep only last 100 interactions
  if (this.interactions.length > 100) {
    this.interactions = this.interactions.slice(-100);
  }
};

module.exports = mongoose.model('SocialProfile', socialProfileSchema);
