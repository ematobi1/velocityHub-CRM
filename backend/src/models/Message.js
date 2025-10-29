const mongoose = require('mongoose');

// WhatsApp/SMS Native Integration (KEY DIFFERENTIATOR - HubSpot charges $200/mo)
const messageSchema = new mongoose.Schema({
  // Message type
  channel: {
    type: String,
    enum: ['sms', 'whatsapp', 'email'],
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'undelivered'],
    default: 'queued'
  },
  // Sender
  from: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    phone: String,
    email: String,
    name: String
  },
  // Recipient
  to: {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    phone: String,
    email: String,
    name: String
  },
  // Content
  content: {
    text: String,
    // Media attachments
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document']
      },
      url: String,
      filename: String,
      size: Number,
      mimeType: String
    }],
    // Template (for WhatsApp Business)
    template: {
      id: String,
      name: String,
      language: String,
      parameters: mongoose.Schema.Types.Mixed
    }
  },
  // Metadata
  metadata: {
    twilioSid: String, // Twilio message SID
    whatsappMessageId: String,
    errorCode: String,
    errorMessage: String,
    segments: Number, // SMS segments
    price: Number,
    priceUnit: String
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
  // Campaign/Sequence
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  sequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailSequence'
  },
  // Timing
  scheduledFor: Date,
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  // AI Features
  aiGenerated: {
    used: Boolean,
    originalPrompt: String,
    confidence: Number
  },
  aiAnalysis: {
    sentiment: {
      type: String,
      enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    },
    intent: String,
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    requiresResponse: Boolean,
    suggestedResponse: String
  },
  // Threading (for conversations)
  threadId: String,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // Cost tracking
  cost: {
    amount: Number,
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
messageSchema.index({ 'from.userId': 1, createdAt: -1 });
messageSchema.index({ 'to.contactId': 1, createdAt: -1 });
messageSchema.index({ 'to.leadId': 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ channel: 1, status: 1 });
messageSchema.index({ scheduledFor: 1, status: 1 });

// Calculate cost
messageSchema.methods.calculateCost = function() {
  let cost = 0;

  if (this.channel === 'sms') {
    // SMS: $0.02 per message
    const segments = this.metadata?.segments || 1;
    cost = segments * 0.02;
  } else if (this.channel === 'whatsapp') {
    // WhatsApp: $0.005 per message
    cost = 0.005;
  }

  this.cost = {
    amount: cost,
    currency: 'USD'
  };

  return this.cost;
};

module.exports = mongoose.model('Message', messageSchema);
