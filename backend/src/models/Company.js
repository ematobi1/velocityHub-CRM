const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  website: String,
  industry: String,
  description: String,
  // Company size
  employeeCount: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  revenue: {
    amount: Number,
    currency: String
  },
  // Contact info
  phone: String,
  email: String,
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Relationships
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  }],
  deals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  }],
  // Company health score
  healthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  // Social media
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  // Tags
  tags: [String],
  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,
  // System fields
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ owner: 1 });
companySchema.index({ industry: 1 });

module.exports = mongoose.model('Company', companySchema);
