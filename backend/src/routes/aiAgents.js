/**
 * AI Agents Routes
 * Manage autonomous AI agents
 */

const express = require('express');
const router = express.Router();
const AIAgent = require('../models/AIAgent');
const agenticAIService = require('../services/agenticAI');
const { auth } = require('../middleware/auth');

/**
 * GET /api/ai-agents
 * Get all agents for a user
 */
router.get('/', auth, async (req, res) => {
  try {
    const agents = await AIAgent.find({
      $or: [
        { owner: req.user.id },
        { sharedWith: req.user.id },
        { isGlobal: true }
      ]
    }).sort({ createdAt: -1 });

    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

/**
 * GET /api/ai-agents/templates
 * Get available agent templates
 */
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = [
      {
        name: 'deal_coach',
        displayName: 'Deal Coach AI',
        description: 'Monitors deals and provides AI coaching to close faster — flags stagnant deals and suggests next steps',
        icon: '🎯',
        autonomyLevel: 'suggest_only',
        estimatedImpact: 'high'
      },
      {
        name: 'churn_prevention',
        displayName: 'Churn Prevention AI',
        description: 'Predicts and prevents customer churn proactively — detects at-risk accounts before they leave',
        icon: '🛡️',
        autonomyLevel: 'act_with_approval',
        estimatedImpact: 'critical'
      },
      {
        name: 'lead_conversion',
        displayName: 'Lead Conversion AI',
        description: 'Optimizes lead conversion with intelligent nurturing — prioritizes hot leads and suggests outreach',
        icon: '🚀',
        autonomyLevel: 'suggest_only',
        estimatedImpact: 'high'
      },
      {
        name: 'customer_success',
        displayName: 'Customer Success AI',
        description: 'Ensures customers achieve their goals — monitors onboarding, adoption, and satisfaction',
        icon: '⭐',
        autonomyLevel: 'act_with_approval',
        estimatedImpact: 'high'
      },
      {
        name: 'renewal_specialist',
        displayName: 'Renewal Specialist AI',
        description: 'Manages renewal pipeline and maximizes retention — never miss a renewal opportunity',
        icon: '🔄',
        autonomyLevel: 'act_with_approval',
        estimatedImpact: 'critical'
      },
      {
        name: 'cross_sell_advisor',
        displayName: 'Cross-Sell Advisor AI',
        description: 'Identifies upsell and cross-sell opportunities — grows revenue from existing customers',
        icon: '💰',
        autonomyLevel: 'suggest_only',
        estimatedImpact: 'high'
      },
      {
        name: 'account_health_monitor',
        displayName: 'Account Health Monitor',
        description: 'Continuously monitors account health — flags at-risk accounts with early warning signals',
        icon: '❤️',
        autonomyLevel: 'act_with_approval',
        estimatedImpact: 'critical'
      },
      {
        name: 'pipeline_optimizer',
        displayName: 'Pipeline Optimizer AI',
        description: 'Analyzes and optimizes your sales pipeline — identifies bottlenecks and accelerates velocity',
        icon: '📊',
        autonomyLevel: 'suggest_only',
        estimatedImpact: 'high'
      },
      {
        name: 'support_assistant',
        displayName: 'Support Assistant AI',
        description: 'Analyzes support patterns and prevents recurring issues — improves customer satisfaction',
        icon: '🤖',
        autonomyLevel: 'fully_autonomous',
        estimatedImpact: 'medium'
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/ai-agents/suggestions/pending
 * Get pending suggestions for user
 */
router.get('/suggestions/pending', auth, async (req, res) => {
  try {
    const suggestions = await agenticAIService.getAgentSuggestions(req.user.id);
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

/**
 * GET /api/ai-agents/analytics/overview
 * Get analytics overview for all agents
 */
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const agents = await AIAgent.find({
      $or: [{ owner: req.user.id }, { sharedWith: req.user.id }]
    });

    const overview = {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalActions: agents.reduce((sum, a) => sum + a.performanceMetrics.totalActions, 0),
      successfulActions: agents.reduce((sum, a) => sum + a.performanceMetrics.successfulActions, 0),
      averageSuccessRate: agents.length > 0
        ? agents.reduce((sum, a) => sum + a.performanceMetrics.successRate, 0) / agents.length
        : 0,
      totalImpactScore: agents.reduce((sum, a) => sum + a.performanceMetrics.impactScore, 0),
      byType: {}
    };

    // Group by type
    agents.forEach(agent => {
      if (!overview.byType[agent.type]) {
        overview.byType[agent.type] = {
          count: 0,
          actions: 0,
          successRate: 0
        };
      }
      overview.byType[agent.type].count++;
      overview.byType[agent.type].actions += agent.performanceMetrics.totalActions;
      overview.byType[agent.type].successRate += agent.performanceMetrics.successRate;
    });

    // Calculate averages
    Object.keys(overview.byType).forEach(type => {
      overview.byType[type].successRate /= overview.byType[type].count;
    });

    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * POST /api/ai-agents/create-from-template
 * Create agent from template
 */
router.post('/create-from-template', auth, async (req, res) => {
  try {
    const { templateName } = req.body;

    if (!templateName) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const agent = await agenticAIService.createAgentFromTemplate(
      templateName,
      req.user.id
    );

    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: error.message || 'Failed to create agent' });
  }
});

/**
 * GET /api/ai-agents/:id
 * Get agent by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check permissions
    if (
      agent.owner.toString() !== req.user.id &&
      !agent.sharedWith.includes(req.user.id) &&
      !agent.isGlobal
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

/**
 * PATCH /api/ai-agents/:id/status
 * Update agent status (activate/pause)
 */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'paused', 'training', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    agent.status = status;
    await agent.save();

    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

/**
 * PATCH /api/ai-agents/:id/autonomy
 * Update agent autonomy level
 */
router.patch('/:id/autonomy', auth, async (req, res) => {
  try {
    const { autonomyLevel } = req.body;

    if (!['suggest_only', 'act_with_approval', 'fully_autonomous'].includes(autonomyLevel)) {
      return res.status(400).json({ error: 'Invalid autonomy level' });
    }

    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    agent.autonomyLevel = autonomyLevel;
    await agent.save();

    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

/**
 * POST /api/ai-agents/:id/actions/:actionIndex/respond
 * Approve or reject agent action
 */
router.post('/:id/actions/:actionIndex/respond', auth, async (req, res) => {
  try {
    const { response } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response' });
    }

    const agent = await agenticAIService.respondToAction(
      req.params.id,
      parseInt(req.params.actionIndex),
      response,
      req.user.id
    );

    res.json(agent);
  } catch (error) {
    console.error('Error responding to action:', error);
    res.status(500).json({ error: error.message || 'Failed to respond to action' });
  }
});

/**
 * POST /api/ai-agents/:id/run-cycle
 * Manually trigger agent monitoring cycle
 */
router.post('/:id/run-cycle', auth, async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Run agent cycle in background
    agenticAIService.runAgentCycle(req.params.id).catch(err => {
      console.error('Agent cycle error:', err);
    });

    res.json({ message: 'Agent cycle started', agentId: agent._id });
  } catch (error) {
    console.error('Error running agent cycle:', error);
    res.status(500).json({ error: 'Failed to run agent cycle' });
  }
});

/**
 * GET /api/ai-agents/:id/performance
 * Get agent performance metrics
 */
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check permissions
    if (
      agent.owner.toString() !== req.user.id &&
      !agent.sharedWith.includes(req.user.id) &&
      !agent.isGlobal
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const performance = {
      metrics: agent.performanceMetrics,
      recentActions: agent.recentActions.slice(0, 20),
      trainingExamples: agent.trainingData.length,
      status: agent.status,
      uptime: agent.status === 'active' ?
        Math.floor((Date.now() - agent.createdAt.getTime()) / 1000 / 60 / 60) : 0
    };

    res.json(performance);
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

/**
 * DELETE /api/ai-agents/:id
 * Delete agent
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const agent = await AIAgent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await agent.deleteOne();
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

module.exports = router;
