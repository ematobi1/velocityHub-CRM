const express = require('express');
const Deal = require('../models/Deal');
const Lead = require('../models/Lead');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all deals (with pipeline grouping)
router.get('/', auth, async (req, res) => {
  try {
    const {
      stage,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 100,
      groupBy = 'none'
    } = req.query;

    // Build query
    const query = { isArchived: false };

    // Filter by user role
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    if (stage) query.stage = stage;

    // Search
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Execute query
    const deals = await Deal.find(query)
      .populate('owner', 'name email')
      .populate('contact', 'firstName lastName email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Deal.countDocuments(query);

    // Group by stage for Kanban view
    let grouped = null;
    if (groupBy === 'stage') {
      const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
      grouped = {};

      for (const stage of stages) {
        const stageQuery = { ...query, stage };
        grouped[stage] = await Deal.find(stageQuery)
          .populate('owner', 'name email')
          .populate('contact', 'firstName lastName email')
          .sort('-value');
      }
    }

    res.json({
      deals,
      grouped,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pipeline analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const query = { isArchived: false };

    // Filter by user role
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    // Calculate pipeline metrics
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const analytics = {
      byStage: {},
      totalValue: 0,
      totalWeightedValue: 0,
      averageDealSize: 0,
      winRate: 0,
      averageSalesCycle: 0
    };

    // Get deals by stage with metrics
    for (const stage of stages) {
      const stageDeals = await Deal.find({ ...query, stage });
      const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
      const stageWeightedValue = stageDeals.reduce((sum, deal) => {
        const prob = deal.aiInsights?.predictedProbability || deal.probability;
        return sum + (deal.value * prob / 100);
      }, 0);

      analytics.byStage[stage] = {
        count: stageDeals.length,
        value: stageValue,
        weightedValue: stageWeightedValue,
        averageValue: stageDeals.length > 0 ? stageValue / stageDeals.length : 0
      };

      analytics.totalValue += stageValue;
      analytics.totalWeightedValue += stageWeightedValue;
    }

    // Calculate win rate
    const closedWon = analytics.byStage.closed_won.count;
    const closedLost = analytics.byStage.closed_lost.count;
    const totalClosed = closedWon + closedLost;
    analytics.winRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

    // Calculate average deal size
    const allDeals = await Deal.countDocuments(query);
    analytics.averageDealSize = allDeals > 0 ? analytics.totalValue / allDeals : 0;

    // Calculate average sales cycle (for closed won deals)
    const closedWonDeals = await Deal.find({ ...query, stage: 'closed_won' });
    if (closedWonDeals.length > 0) {
      const totalDays = closedWonDeals.reduce((sum, deal) => {
        const days = Math.floor((deal.wonAt - deal.createdAt) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      analytics.averageSalesCycle = totalDays / closedWonDeals.length;
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single deal
router.get('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('contact', 'firstName lastName email phone company')
      .populate('company')
      .populate('lead');

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && deal.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create deal
router.post('/', auth, async (req, res) => {
  try {
    const dealData = {
      ...req.body,
      owner: req.body.owner || req.user._id,
      createdBy: req.user._id
    };

    const deal = new Deal(dealData);
    await deal.save();

    // If converting from lead, update lead status
    if (req.body.lead) {
      await Lead.findByIdAndUpdate(req.body.lead, {
        status: 'converted',
        convertedAt: new Date(),
        convertedToDeal: deal._id
      });
    }

    res.status(201).json(deal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update deal
router.put('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && deal.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Track stage changes
    if (req.body.stage && req.body.stage !== deal.stage) {
      deal.activities.push({
        type: 'stage_change',
        description: `Stage changed from ${deal.stage} to ${req.body.stage}`,
        date: new Date(),
        userId: req.user._id,
        outcome: `Moved to ${req.body.stage}`
      });

      // Update timestamps for closed deals
      if (req.body.stage === 'closed_won') {
        req.body.wonAt = new Date();
      } else if (req.body.stage === 'closed_lost') {
        req.body.lostAt = new Date();
      }
    }

    Object.assign(deal, req.body);
    await deal.save();

    res.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Move deal to different stage (Kanban drag-and-drop)
router.patch('/:id/stage', auth, async (req, res) => {
  try {
    const { stage } = req.body;
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && deal.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const oldStage = deal.stage;
    deal.stage = stage;

    // Update probability based on stage
    const stageProbabilities = {
      prospecting: 10,
      qualification: 25,
      proposal: 50,
      negotiation: 75,
      closed_won: 100,
      closed_lost: 0
    };
    deal.probability = stageProbabilities[stage] || deal.probability;

    // Add activity
    deal.activities.push({
      type: 'stage_change',
      description: `Stage changed from ${oldStage} to ${stage}`,
      date: new Date(),
      userId: req.user._id
    });

    // Update timestamps for closed deals
    if (stage === 'closed_won') {
      deal.wonAt = new Date();
    } else if (stage === 'closed_lost') {
      deal.lostAt = new Date();
    }

    await deal.save();

    res.json(deal);
  } catch (error) {
    console.error('Error moving deal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add activity to deal
router.post('/:id/activities', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && deal.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    deal.activities.push({
      ...req.body,
      date: new Date(),
      userId: req.user._id
    });

    // Update metrics
    if (req.body.type === 'email') {
      deal.metrics.emailsSent++;
    } else if (req.body.type === 'call') {
      deal.metrics.callsMade++;
    } else if (req.body.type === 'meeting') {
      deal.metrics.meetingsHeld++;
    }

    deal.metrics.lastContactDate = new Date();
    deal.updateDaysSinceLastContact();

    await deal.save();

    res.json(deal);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(400).json({ error: error.message });
  }
});

// Request AI analysis for deal
router.post('/:id/ai-analysis', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('contact')
      .populate('owner');

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && deal.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // AI analysis using OpenAI
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      if (process.env.OPENAI_API_KEY) {
        const prompt = `Analyze this sales deal and provide insights:

Deal Details:
- Name: ${deal.name}
- Value: $${deal.value}
- Stage: ${deal.stage}
- Current Probability: ${deal.probability}%
- Expected Close Date: ${new Date(deal.closeDate).toLocaleDateString()}
- Days Until Close: ${Math.ceil((new Date(deal.closeDate) - new Date()) / (1000 * 60 * 60 * 24))}
- Source: ${deal.source}
${deal.contact ? `- Contact: ${deal.contact.firstName} ${deal.contact.lastName}` : ''}

Provide a JSON response with:
1. predictedProbability (0-100): AI-predicted win probability
2. confidence (0-100): Confidence in prediction
3. expectedDaysToClose: Predicted days to close
4. riskFactors: Array of {factor, severity (low/medium/high), description}
5. recommendations: Array of actionable recommendations`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert sales analyst. Provide concise, actionable insights in JSON format only."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        });

        const insights = JSON.parse(completion.choices[0].message.content);

        deal.aiInsights = {
          ...insights,
          forecastedRevenue: {
            low: deal.value * 0.7,
            expected: deal.value,
            high: deal.value * 1.2
          },
          analyzedAt: new Date()
        };
      } else {
        // Fallback mock insights if no API key
        deal.aiInsights = {
          predictedProbability: Math.min(100, deal.probability + Math.random() * 20),
          confidence: 75 + Math.random() * 20,
          forecastedRevenue: {
            low: deal.value * 0.7,
            expected: deal.value,
            high: deal.value * 1.2
          },
          expectedDaysToClose: 30 + Math.random() * 30,
          riskFactors: [
            {
              factor: 'Low engagement',
              severity: 'medium',
              description: 'Customer has not responded to last 2 emails'
            }
          ],
          recommendations: [
            'Schedule a follow-up call within 48 hours',
            'Send personalized value proposition',
            'Identify and engage with additional stakeholders'
          ]
        };
      }
    } catch (error) {
      logger.error('Error generating AI insights:', error);
      // Fallback to mock data on error
      deal.aiInsights = {
        predictedProbability: deal.probability,
        confidence: 50,
        forecastedRevenue: {
          low: deal.value * 0.7,
          expected: deal.value,
          high: deal.value * 1.2
        },
        expectedDaysToClose: Math.ceil((new Date(deal.closeDate) - new Date()) / (1000 * 60 * 60 * 24)),
        riskFactors: [],
        recommendations: ['Enable AI analysis by configuring OPENAI_API_KEY']
      };
    }

    // Include previously defined insights
    deal.aiInsights = {
      ...deal.aiInsights,
      positiveSignals: [
        {
          signal: 'Budget confirmed',
          strength: 'strong',
          description: 'Customer confirmed budget availability'
        }
      ],
      recommendedActions: [
        {
          action: 'Schedule follow-up call',
          priority: 'high',
          reason: 'No contact in 7 days',
          estimatedImpact: '+15% close probability'
        }
      ],
      engagementScore: 65 + Math.random() * 30,
      lastAnalyzed: new Date(),
      modelVersion: '1.0'
    };

    await deal.save();

    res.json(deal.aiInsights);
  } catch (error) {
    console.error('Error analyzing deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete deal (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && deal.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    deal.isArchived = true;
    deal.archivedAt = new Date();
    await deal.save();

    res.json({ message: 'Deal archived successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
