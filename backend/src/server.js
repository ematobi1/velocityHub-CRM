require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/validateEnv');
const swaggerSpec = require('./config/swagger');

// Validate environment variables before starting
try {
  validateEnvironment();
} catch (error) {
  logger.error('Failed to start server due to environment validation errors');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const chatRoutes = require('./routes/chat');
const dealsRoutes = require('./routes/deals');
const contactsRoutes = require('./routes/contacts');
const companiesRoutes = require('./routes/companies');
const analyticsRoutes = require('./routes/analytics');
const emailSequencesRoutes = require('./routes/emailSequences');

// New advanced feature routes
const conversationIntelligenceRoutes = require('./routes/conversationIntelligence');
const workflowsRoutes = require('./routes/workflows');
const socialMediaRoutes = require('./routes/socialMedia');
const leadEnrichmentRoutes = require('./routes/leadEnrichment');

// Revolutionary AI features
const aiAgentsRoutes = require('./routes/aiAgents');
const customerHealthRoutes = require('./routes/customerHealth');
const relationshipGraphRoutes = require('./routes/relationshipGraph');
const aiAnalyticsRoutes = require('./routes/aiAnalytics');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VelocityHub CRM API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'VelocityHub CRM API',
    version: '1.0.0',
    description: 'AI-Powered Sales Intelligence Platform',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
    endpoints: {
      authentication: '/api/auth',
      leads: '/api/leads',
      deals: '/api/deals',
      contacts: '/api/contacts',
      companies: '/api/companies',
      analytics: '/api/analytics',
      emailSequences: '/api/email-sequences',
      workflows: '/api/workflows',
      aiFeatures: {
        chatbot: '/api/chat',
        aiAgents: '/api/ai-agents',
        customerHealth: '/api/customer-health',
        relationshipGraph: '/api/relationship-graph',
        aiAnalytics: '/api/ai-analytics',
      },
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email-sequences', emailSequencesRoutes);

// Advanced feature routes
app.use('/api/conversation-intelligence', conversationIntelligenceRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/lead-enrichment', leadEnrichmentRoutes);

// Revolutionary AI feature routes
app.use('/api/ai-agents', aiAgentsRoutes);
app.use('/api/customer-health', customerHealthRoutes);
app.use('/api/relationship-graph', relationshipGraphRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    logger.info('✅ Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running at http://localhost:${PORT}`);
      logger.info(`🌐 Accepting requests from: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
