require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const chatRoutes = require('./routes/chat');
const dealsRoutes = require('./routes/deals');
const contactsRoutes = require('./routes/contacts');
const companiesRoutes = require('./routes/companies');
const analyticsRoutes = require('./routes/analytics');
const emailSequencesRoutes = require('./routes/emailSequences');
const conversationIntelligenceRoutes = require('./routes/conversationIntelligence');
const workflowsRoutes = require('./routes/workflows');
const socialMediaRoutes = require('./routes/socialMedia');
const leadEnrichmentRoutes = require('./routes/leadEnrichment');
const aiAgentsRoutes = require('./routes/aiAgents');
const customerHealthRoutes = require('./routes/customerHealth');
const relationshipGraphRoutes = require('./routes/relationshipGraph');
const aiAnalyticsRoutes = require('./routes/aiAnalytics');
const notificationsRoutes = require('./routes/notifications');
const ticketsRoutes = require('./routes/tickets');
const revenueIntelligenceRoutes = require('./routes/revenueIntelligence');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://velocityhub-crm.netlify.app',
  ],
  credentials: true,
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email-sequences', emailSequencesRoutes);
app.use('/api/conversation-intelligence', conversationIntelligenceRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/lead-enrichment', leadEnrichmentRoutes);
app.use('/api/ai-agents', aiAgentsRoutes);
app.use('/api/customer-health', customerHealthRoutes);
app.use('/api/relationship-graph', relationshipGraphRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/revenue-intelligence', revenueIntelligenceRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Cached MongoDB connection for serverless environments
let dbPromise = null;

function connectDB() {
  if (!dbPromise) {
    dbPromise = mongoose.connect(process.env.MONGODB_URI).then(() => {
      logger.info('Connected to MongoDB');
    });
  }
  return dbPromise;
}

module.exports = { app, connectDB };
