const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');
const workflowEngine = require('../services/workflowEngine');
const logger = require('../utils/logger');
const { auth } = require('../middleware/auth');

/**
 * @route   GET /api/workflows
 * @desc    Get all workflows
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { entity, status, search } = req.query;

    const query = {};

    if (entity) query.entity = entity;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const workflows = await Workflow.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ workflows });
  } catch (error) {
    logger.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
});

/**
 * @route   GET /api/workflows/analytics/overview
 * @desc    Get workflow analytics overview
 * @access  Private (Admin/Manager)
 */
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const workflows = await Workflow.find();

    const analytics = {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.status === 'active').length,
      pausedWorkflows: workflows.filter(w => w.status === 'paused').length,
      draftWorkflows: workflows.filter(w => w.status === 'draft').length,
      totalExecutions: workflows.reduce((sum, w) => sum + w.stats.totalExecutions, 0),
      successfulExecutions: workflows.reduce((sum, w) => sum + w.stats.successfulExecutions, 0),
      failedExecutions: workflows.reduce((sum, w) => sum + w.stats.failedExecutions, 0),
      successRate: 0,
      topWorkflows: [],
      workflowsByEntity: {}
    };

    // Calculate success rate
    if (analytics.totalExecutions > 0) {
      analytics.successRate = (analytics.successfulExecutions / analytics.totalExecutions) * 100;
    }

    // Top performing workflows
    analytics.topWorkflows = workflows
      .filter(w => w.stats.totalExecutions > 0)
      .sort((a, b) => b.stats.successfulExecutions - a.stats.successfulExecutions)
      .slice(0, 5)
      .map(w => ({
        id: w._id,
        name: w.name,
        executions: w.stats.totalExecutions,
        successRate: (w.stats.successfulExecutions / w.stats.totalExecutions) * 100
      }));

    // Workflows by entity
    workflows.forEach(w => {
      if (!analytics.workflowsByEntity[w.entity]) {
        analytics.workflowsByEntity[w.entity] = {
          total: 0,
          active: 0,
          executions: 0
        };
      }
      analytics.workflowsByEntity[w.entity].total++;
      if (w.status === 'active') analytics.workflowsByEntity[w.entity].active++;
      analytics.workflowsByEntity[w.entity].executions += w.stats.totalExecutions;
    });

    res.json(analytics);
  } catch (error) {
    logger.error('Get workflow analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

/**
 * @route   POST /api/workflows/templates/:template
 * @desc    Create workflow from template
 * @access  Private (Admin/Manager)
 */
router.post('/templates/:template', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const templates = {
      'lead-scoring-alert': {
        name: 'High Score Lead Alert',
        description: 'Notify when lead score reaches hot threshold',
        entity: 'lead',
        trigger: {
          type: 'score_threshold',
          conditions: [{
            field: 'aiScore.overall',
            operator: 'greater_than',
            value: 80
          }]
        },
        actions: [
          {
            type: 'send_notification',
            config: {
              notificationMessage: 'Hot lead: {{firstName}} {{lastName}} - Score: 80+'
            },
            order: 0
          },
          {
            type: 'create_task',
            config: {
              taskTitle: 'Follow up with hot lead: {{firstName}} {{lastName}}',
              taskDescription: 'This lead has a high score and should be contacted immediately',
              taskDueDate: 'immediate',
              taskPriority: 'urgent'
            },
            order: 1
          }
        ]
      },
      'inactive-lead-followup': {
        name: 'Inactive Lead Follow-up',
        description: 'Create task for leads inactive for 7+ days',
        entity: 'lead',
        trigger: {
          type: 'inactivity',
          inactivityDays: 7
        },
        actions: [
          {
            type: 'create_task',
            config: {
              taskTitle: 'Re-engage inactive lead: {{firstName}} {{lastName}}',
              taskDescription: 'This lead has been inactive for 7 days',
              taskDueDate: 'in_1_day',
              taskPriority: 'medium'
            },
            order: 0
          }
        ]
      },
      'deal-won-celebration': {
        name: 'Deal Won Celebration',
        description: 'Celebrate and create onboarding tasks when deal is won',
        entity: 'deal',
        trigger: {
          type: 'stage_changed',
          conditions: [{
            field: 'stage',
            operator: 'equals',
            value: 'closed_won'
          }]
        },
        actions: [
          {
            type: 'send_notification',
            config: {
              notificationMessage: 'Deal won! {{name}} - ${{value}}'
            },
            order: 0
          },
          {
            type: 'create_task',
            config: {
              taskTitle: 'Start onboarding for {{name}}',
              taskDescription: 'Begin customer onboarding process',
              taskDueDate: 'immediate',
              taskPriority: 'high'
            },
            order: 1
          },
          {
            type: 'add_tag',
            config: {
              tags: ['customer', 'onboarding']
            },
            order: 2
          }
        ]
      },
      'auto-assign-leads': {
        name: 'Auto-assign New Leads',
        description: 'Automatically assign new leads to sales reps',
        entity: 'lead',
        trigger: {
          type: 'record_created'
        },
        actions: [
          {
            type: 'assign_owner',
            config: {
              assignmentType: 'round_robin'
            },
            order: 0
          },
          {
            type: 'create_task',
            config: {
              taskTitle: 'Contact new lead: {{firstName}} {{lastName}}',
              taskDescription: 'First contact with new lead',
              taskDueDate: 'in_1_day',
              taskPriority: 'high'
            },
            order: 1
          }
        ]
      }
    };

    const template = templates[req.params.template];

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const workflow = new Workflow({
      ...template,
      createdBy: req.user.id,
      status: 'draft'
    });

    await workflow.save();

    res.status(201).json(workflow);
  } catch (error) {
    logger.error('Create workflow from template error:', error);

    // Return detailed error for debugging
    const errorMessage = error.message || 'Failed to create workflow';
    const validationErrors = error.errors ? Object.keys(error.errors).map(key => ({
      field: key,
      message: error.errors[key].message
    })) : null;

    res.status(500).json({
      error: errorMessage,
      details: validationErrors,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/workflows/trigger/:triggerType
 * @desc    Manually trigger workflows (for testing/integration)
 * @access  Private
 */
router.post('/trigger/:triggerType', auth, async (req, res) => {
  try {
    const { entity, recordId, changeData } = req.body;

    if (!entity || !recordId) {
      return res.status(400).json({ error: 'entity and recordId are required' });
    }

    await workflowEngine.processTrigger(
      req.params.triggerType,
      entity,
      recordId,
      changeData
    );

    res.json({ message: 'Workflows triggered successfully' });
  } catch (error) {
    logger.error('Manual trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger workflows' });
  }
});

/**
 * @route   GET /api/workflows/:id
 * @desc    Get workflow by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    logger.error('Get workflow error:', error);
    res.status(500).json({ error: 'Failed to retrieve workflow' });
  }
});

/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Private (Admin/Manager)
 */
router.post('/', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can create workflows' });
    }

    const workflowData = {
      ...req.body,
      createdBy: req.user.id
    };

    const workflow = new Workflow(workflowData);
    await workflow.save();

    res.status(201).json(workflow);
  } catch (error) {
    logger.error('Create workflow error:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * @route   PUT /api/workflows/:id
 * @desc    Update a workflow
 * @access  Private (Admin/Manager)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can update workflows' });
    }

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'stats') {
        workflow[key] = req.body[key];
      }
    });

    await workflow.save();

    res.json(workflow);
  } catch (error) {
    logger.error('Update workflow error:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Delete a workflow
 * @access  Private (Admin)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete workflows' });
    }

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await workflow.deleteOne();

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    logger.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * @route   PATCH /api/workflows/:id/activate
 * @desc    Activate a workflow
 * @access  Private (Admin/Manager)
 */
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    workflow.status = 'active';
    await workflow.save();

    res.json(workflow);
  } catch (error) {
    logger.error('Activate workflow error:', error);
    res.status(500).json({ error: 'Failed to activate workflow' });
  }
});

/**
 * @route   PATCH /api/workflows/:id/pause
 * @desc    Pause a workflow
 * @access  Private (Admin/Manager)
 */
router.patch('/:id/pause', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    workflow.status = 'paused';
    await workflow.save();

    res.json(workflow);
  } catch (error) {
    logger.error('Pause workflow error:', error);
    res.status(500).json({ error: 'Failed to pause workflow' });
  }
});

/**
 * @route   PATCH /api/workflows/:id/archive
 * @desc    Archive a workflow
 * @access  Private (Admin/Manager)
 */
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    workflow.status = 'archived';
    await workflow.save();

    res.json(workflow);
  } catch (error) {
    logger.error('Archive workflow error:', error);
    res.status(500).json({ error: 'Failed to archive workflow' });
  }
});

/**
 * @route   POST /api/workflows/:id/test
 * @desc    Test a workflow on a specific record
 * @access  Private (Admin/Manager)
 */
router.post('/:id/test', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ error: 'recordId is required' });
    }

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Execute workflow in test mode (won't save to stats)
    await workflowEngine.executeWorkflow(workflow, recordId);

    res.json({ message: 'Workflow test executed', workflow });
  } catch (error) {
    logger.error('Test workflow error:', error);
    res.status(500).json({ error: 'Failed to test workflow' });
  }
});

/**
 * @route   GET /api/workflows/:id/executions
 * @desc    Get workflow execution history
 * @access  Private
 */
router.get('/:id/executions', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const executions = workflow.recentExecutions.slice(0, limit);

    res.json({
      executions,
      stats: workflow.stats
    });
  } catch (error) {
    logger.error('Get workflow executions error:', error);
    res.status(500).json({ error: 'Failed to retrieve executions' });
  }
});

module.exports = router;
