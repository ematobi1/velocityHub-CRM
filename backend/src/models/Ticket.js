const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'agent'], required: true },
  senderName: String,
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'], default: 'open' },
  category: { type: String, enum: ['billing', 'technical', 'feature_request', 'bug', 'general'], default: 'general' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [messageSchema],
  resolvedAt: Date,
  firstResponseAt: Date,
  tags: [String]
}, { timestamps: true });

ticketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `VH-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
