const express = require('express');
const router = express.Router();
const conversationIntelligenceService = require('../ai/conversationIntelligence');
const ConversationIntelligence = require('../models/ConversationIntelligence');
const VoiceCall = require('../models/VoiceCall');
const logger = require('../utils/logger');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/conversation-intelligence/analyze
 * @desc    Analyze a conversation and extract intelligence
 * @access  Private
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    const {
      conversationType,
      conversationId,
      transcript,
      leadId,
      contactId,
      dealId,
      conversationDate,
      duration
    } = req.body;

    if (!conversationType || !transcript) {
      return res.status(400).json({
        error: 'conversationType and transcript are required'
      });
    }

    const intelligence = await conversationIntelligenceService.analyzeConversation({
      conversationType,
      conversationId: conversationId || new require('mongodb').ObjectId(),
      transcript,
      user: req.user.id,
      lead: leadId,
      contact: contactId,
      deal: dealId,
      conversationDate: conversationDate || new Date(),
      duration
    });

    res.json(intelligence);
  } catch (error) {
    logger.error('Conversation analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
});

/**
 * @route   POST /api/conversation-intelligence/analyze-call/:callId
 * @desc    Analyze a specific voice call
 * @access  Private
 */
router.post('/analyze-call/:callId', auth, async (req, res) => {
  try {
    const call = await VoiceCall.findById(req.params.callId);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (!call.transcript || !call.transcript.fullText) {
      return res.status(400).json({ error: 'Call transcript not available' });
    }

    const intelligence = await conversationIntelligenceService.analyzeConversation({
      conversationType: 'call',
      conversationId: call._id,
      transcript: call.transcript.fullText,
      user: req.user.id,
      lead: call.lead,
      contact: call.contact,
      conversationDate: call.startTime,
      duration: call.duration
    });

    // Update call with intelligence reference
    call.aiAnalysis = {
      intelligenceId: intelligence._id,
      sentiment: intelligence.sentiment.overall,
      qualityScore: intelligence.qualityScore
    };
    await call.save();

    res.json(intelligence);
  } catch (error) {
    logger.error('Call analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze call' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/:id
 * @desc    Get conversation intelligence by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const intelligence = await ConversationIntelligence.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('lead', 'firstName lastName email company')
      .populate('contact', 'firstName lastName email')
      .populate('deal', 'name value stage');

    if (!intelligence) {
      return res.status(404).json({ error: 'Conversation intelligence not found' });
    }

    res.json(intelligence);
  } catch (error) {
    logger.error('Get conversation intelligence error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation intelligence' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/lead/:leadId
 * @desc    Get all conversation intelligence for a lead
 * @access  Private
 */
router.get('/lead/:leadId', auth, async (req, res) => {
  try {
    const intelligence = await conversationIntelligenceService.getConversationHistory({
      lead: req.params.leadId,
      limit: parseInt(req.query.limit) || 10
    });

    res.json(intelligence);
  } catch (error) {
    logger.error('Get lead conversation history error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/contact/:contactId
 * @desc    Get all conversation intelligence for a contact
 * @access  Private
 */
router.get('/contact/:contactId', auth, async (req, res) => {
  try {
    const intelligence = await conversationIntelligenceService.getConversationHistory({
      contact: req.params.contactId,
      limit: parseInt(req.query.limit) || 10
    });

    res.json(intelligence);
  } catch (error) {
    logger.error('Get contact conversation history error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/deal/:dealId
 * @desc    Get all conversation intelligence for a deal
 * @access  Private
 */
router.get('/deal/:dealId', auth, async (req, res) => {
  try {
    const intelligence = await conversationIntelligenceService.getConversationHistory({
      deal: req.params.dealId,
      limit: parseInt(req.query.limit) || 10
    });

    res.json(intelligence);
  } catch (error) {
    logger.error('Get deal conversation history error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/user/coaching-insights
 * @desc    Get coaching insights for the current user
 * @access  Private
 */
router.get('/user/coaching-insights', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const insights = await conversationIntelligenceService.getUserCoachingInsights(
      req.user.id,
      days
    );

    res.json(insights);
  } catch (error) {
    logger.error('Get coaching insights error:', error);
    res.status(500).json({ error: 'Failed to retrieve coaching insights' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/team/insights
 * @desc    Get team-wide conversation insights (Admin/Manager only)
 * @access  Private (Admin/Manager)
 */
router.get('/team/insights', auth, async (req, res) => {
  try {
    // Check if user is admin or manager
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conversations = await ConversationIntelligence.find({
      conversationDate: { $gte: startDate },
      processingStatus: 'completed'
    }).populate('user', 'firstName lastName email');

    // Aggregate team metrics
    const metrics = {
      totalConversations: conversations.length,
      averageSentiment: 0,
      averageQualityScore: 0,
      topPerformers: [],
      commonRisks: [],
      commonCoachingNeeds: [],
      sentimentDistribution: {
        very_positive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        very_negative: 0
      }
    };

    // Calculate averages
    let sentimentSum = 0;
    let qualitySum = 0;
    const userScores = {};
    const riskCounts = {};
    const coachingCounts = {};

    conversations.forEach(conv => {
      sentimentSum += conv.sentiment.score || 0;
      qualitySum += conv.qualityScore || 0;

      // Sentiment distribution
      metrics.sentimentDistribution[conv.sentiment.overall] =
        (metrics.sentimentDistribution[conv.sentiment.overall] || 0) + 1;

      // User scores
      const userId = conv.user._id.toString();
      if (!userScores[userId]) {
        userScores[userId] = {
          user: conv.user,
          totalQuality: 0,
          count: 0
        };
      }
      userScores[userId].totalQuality += conv.qualityScore || 0;
      userScores[userId].count++;

      // Risk aggregation
      conv.risks.forEach(risk => {
        riskCounts[risk.type] = (riskCounts[risk.type] || 0) + 1;
      });

      // Coaching needs
      conv.coachingTips.forEach(tip => {
        coachingCounts[tip.category] = (coachingCounts[tip.category] || 0) + 1;
      });
    });

    metrics.averageSentiment = conversations.length > 0 ? sentimentSum / conversations.length : 0;
    metrics.averageQualityScore = conversations.length > 0 ? qualitySum / conversations.length : 0;

    // Top performers
    metrics.topPerformers = Object.values(userScores)
      .map(u => ({
        user: u.user,
        averageQuality: u.totalQuality / u.count,
        conversationCount: u.count
      }))
      .sort((a, b) => b.averageQuality - a.averageQuality)
      .slice(0, 5);

    // Common risks
    metrics.commonRisks = Object.entries(riskCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Common coaching needs
    metrics.commonCoachingNeeds = Object.entries(coachingCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json(metrics);
  } catch (error) {
    logger.error('Get team insights error:', error);
    res.status(500).json({ error: 'Failed to retrieve team insights' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/analytics/sentiment-trends
 * @desc    Get sentiment trends over time
 * @access  Private
 */
router.get('/analytics/sentiment-trends', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conversations = await ConversationIntelligence.find({
      user: req.user.id,
      conversationDate: { $gte: startDate },
      processingStatus: 'completed'
    }).sort({ conversationDate: 1 });

    // Group by day
    const trends = {};
    conversations.forEach(conv => {
      const date = conv.conversationDate.toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = {
          date,
          sentimentScores: [],
          qualityScores: [],
          count: 0
        };
      }
      trends[date].sentimentScores.push(conv.sentiment.score);
      trends[date].qualityScores.push(conv.qualityScore);
      trends[date].count++;
    });

    // Calculate averages
    const trendData = Object.values(trends).map(day => ({
      date: day.date,
      averageSentiment: day.sentimentScores.reduce((a, b) => a + b, 0) / day.sentimentScores.length,
      averageQuality: day.qualityScores.reduce((a, b) => a + b, 0) / day.qualityScores.length,
      conversationCount: day.count
    }));

    res.json(trendData);
  } catch (error) {
    logger.error('Get sentiment trends error:', error);
    res.status(500).json({ error: 'Failed to retrieve sentiment trends' });
  }
});

/**
 * @route   PATCH /api/conversation-intelligence/:id/action-items/:actionId
 * @desc    Update action item status
 * @access  Private
 */
router.patch('/:id/action-items/:actionId', auth, async (req, res) => {
  try {
    const { completed, assignedTo, dueDate, priority } = req.body;

    const intelligence = await ConversationIntelligence.findById(req.params.id);

    if (!intelligence) {
      return res.status(404).json({ error: 'Conversation intelligence not found' });
    }

    const actionItem = intelligence.actionItems.id(req.params.actionId);

    if (!actionItem) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    if (completed !== undefined) actionItem.completed = completed;
    if (assignedTo) actionItem.assignedTo = assignedTo;
    if (dueDate) actionItem.dueDate = dueDate;
    if (priority) actionItem.priority = priority;

    await intelligence.save();

    res.json(intelligence);
  } catch (error) {
    logger.error('Update action item error:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

/**
 * @route   GET /api/conversation-intelligence/search
 * @desc    Search conversations by keywords, sentiment, or topics
 * @access  Private
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { keyword, sentiment, topic, startDate, endDate } = req.query;

    const query = { user: req.user.id, processingStatus: 'completed' };

    if (keyword) {
      query.$or = [
        { transcript: { $regex: keyword, $options: 'i' } },
        { 'summary.brief': { $regex: keyword, $options: 'i' } }
      ];
    }

    if (sentiment) {
      query['sentiment.overall'] = sentiment;
    }

    if (topic) {
      query['topics.topic'] = { $regex: topic, $options: 'i' };
    }

    if (startDate || endDate) {
      query.conversationDate = {};
      if (startDate) query.conversationDate.$gte = new Date(startDate);
      if (endDate) query.conversationDate.$lte = new Date(endDate);
    }

    const conversations = await ConversationIntelligence.find(query)
      .sort({ conversationDate: -1 })
      .limit(50)
      .populate('user', 'firstName lastName')
      .populate('lead', 'firstName lastName company')
      .select('-transcript'); // Exclude full transcript for performance

    res.json(conversations);
  } catch (error) {
    logger.error('Search conversations error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

module.exports = router;
