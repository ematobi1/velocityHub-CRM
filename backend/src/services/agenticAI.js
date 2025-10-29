/**
 * Agentic AI Service
 * Autonomous AI agents that monitor, learn, and act
 */

const AIAgent = require('../models/AIAgent');
const CustomerHealth = require('../models/CustomerHealth');
const Deal = require('../models/Deal');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const logger = require('../utils/logger');

class AgenticAIService {
  constructor() {
    this.runningAgents = new Map();
  }

  /**
   * Create AI Agent from template
   */
  async createAgentFromTemplate(templateName, userId) {
    const templates = {
      deal_coach: {
        name: 'Deal Coach AI',
        type: 'deal_coach',
        description: 'Monitors deals and provides coaching to close faster',
        capabilities: [
          { action: 'monitor_pipeline', enabled: true },
          { action: 'analyze_sentiment', enabled: true },
          { action: 'suggest_actions', enabled: true },
          { action: 'create_tasks', enabled: true },
          { action: 'send_notifications', enabled: true }
        ],
        autonomyLevel: 'suggest_only',
        monitoringRules: [{
          entity: 'deal',
          condition: { field: 'stage', operator: 'equals', value: 'negotiation' },
          checkFrequency: 'daily'
        }],
        playbooks: [{
          name: 'Stagnant Deal Revival',
          trigger: {
            type: 'deal_stagnant',
            description: 'Deal hasn\'t moved in 7+ days',
            conditions: [{ field: 'daysInStage', operator: '>', value: 7 }]
          },
          actions: [
            {
              type: 'send_notification',
              config: {
                message: '🚨 Deal {{dealName}} has been stagnant for {{days}} days. Time to take action!',
                recipients: ['owner']
              }
            },
            {
              type: 'create_task',
              config: {
                title: 'Re-engage with {{accountName}}',
                description: 'This deal needs attention. Suggested actions:\n1. Schedule a call\n2. Send a value proposition email\n3. Introduce executive sponsor',
                priority: 'high',
                dueDate: 'tomorrow'
              }
            }
          ],
          priority: 1
        }]
      },

      churn_prevention: {
        name: 'Churn Prevention AI',
        type: 'churn_prevention',
        description: 'Predicts and prevents customer churn proactively',
        capabilities: [
          { action: 'predict_churn', enabled: true },
          { action: 'analyze_patterns', enabled: true },
          { action: 'trigger_workflows', enabled: true },
          { action: 'escalate_issues', enabled: true }
        ],
        autonomyLevel: 'act_with_approval',
        playbooks: [{
          name: 'High Churn Risk Response',
          trigger: {
            type: 'churn_risk_high',
            description: 'Customer health score drops below 40',
            conditions: [{ field: 'healthScore', operator: '<', value: 40 }]
          },
          actions: [
            {
              type: 'escalate',
              config: {
                to: 'customer_success_manager',
                urgency: 'high',
                message: 'Account {{accountName}} showing high churn risk ({{churnProbability}}%). Immediate action required.'
              }
            },
            {
              type: 'schedule_meeting',
              config: {
                type: 'qbr',
                participants: ['account_owner', 'customer_success'],
                deadline: '3_days'
              }
            }
          ],
          priority: 1
        }]
      },

      lead_conversion: {
        name: 'Lead Conversion AI',
        type: 'lead_conversion',
        description: 'Optimizes lead conversion with intelligent nurturing',
        capabilities: [
          { action: 'analyze_sentiment', enabled: true },
          { action: 'suggest_actions', enabled: true },
          { action: 'trigger_workflows', enabled: true },
          { action: 'generate_content', enabled: true }
        ],
        autonomyLevel: 'suggest_only',
        playbooks: [{
          name: 'Hot Lead Accelerator',
          trigger: {
            type: 'lead_score_high',
            description: 'Lead score reaches 80+',
            conditions: [{ field: 'aiScore', operator: '>=', value: 80 }]
          },
          actions: [
            {
              type: 'reach_out_to_rep',
              config: {
                message: '🔥 Hot lead alert! {{leadName}} just hit a score of {{score}}. Strike while the iron is hot!',
                suggestedActions: [
                  'Call within the next hour',
                  'Send personalized demo video',
                  'Offer expedited onboarding'
                ]
              }
            },
            {
              type: 'generate_proposal',
              config: {
                template: 'enterprise',
                customization: 'high',
                includeROI: true
              },
              requiresApproval: true
            }
          ],
          priority: 1
        }]
      },

      support_assistant: {
        name: 'Support Assistant AI',
        type: 'support_assistant',
        description: 'Analyzes support patterns and prevents issues',
        capabilities: [
          { action: 'analyze_patterns', enabled: true },
          { action: 'suggest_actions', enabled: true },
          { action: 'update_records', enabled: true }
        ],
        autonomyLevel: 'fully_autonomous',
        playbooks: [{
          name: 'Recurring Issue Pattern',
          trigger: {
            type: 'recurring_issue',
            description: 'Same issue reported 3+ times',
            conditions: [{ field: 'issueCount', operator: '>=', value: 3 }]
          },
          actions: [
            {
              type: 'create_task',
              config: {
                title: 'Address recurring issue: {{issueType}}',
                assignTo: 'product_team',
                priority: 'high'
              }
            },
            {
              type: 'update_field',
              config: {
                entity: 'knowledge_base',
                action: 'create_article',
                topic: '{{issueType}}'
              }
            }
          ],
          priority: 2
        }]
      }
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error('Template not found');
    }

    const agent = new AIAgent({
      ...template,
      owner: userId,
      status: 'active',
      aiModel: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        systemPrompt: `You are a ${template.name}. ${template.description}. Always provide actionable, specific recommendations based on data.`
      },
      settings: {
        notifyOnActions: true,
        dailyDigest: true,
        maxActionsPerDay: 50
      },
      trainingData: [],
      recentActions: []
    });

    await agent.save();
    return agent;
  }

  /**
   * Run agent monitoring cycle
   */
  async runAgentCycle(agentId) {
    try {
      const agent = await AIAgent.findById(agentId);
      if (!agent || agent.status !== 'active') return;

      logger.info(`Running cycle for agent: ${agent.name}`);

      // Execute each playbook
      for (const playbook of agent.playbooks) {
        await this.executePlaybook(agent, playbook);
      }

      await agent.save();
    } catch (error) {
      logger.error('Agent cycle error:', error);
    }
  }

  /**
   * Execute a playbook
   */
  async executePlaybook(agent, playbook) {
    try {
      // Find entities that match trigger conditions
      const matches = await this.findMatchingEntities(agent, playbook.trigger);

      for (const match of matches) {
        // Check if already acted on this entity recently
        const recentAction = agent.recentActions.find(
          a => a.entityId.toString() === match._id.toString() &&
               Date.now() - a.timestamp < 24 * 60 * 60 * 1000 // 24 hours
        );

        if (recentAction) continue;

        // Execute actions
        for (const action of playbook.actions) {
          await this.executeAction(agent, action, match);
        }
      }
    } catch (error) {
      logger.error('Playbook execution error:', error);
    }
  }

  /**
   * Find entities matching trigger conditions
   */
  async findMatchingEntities(agent, trigger) {
    const matches = [];

    for (const rule of agent.monitoringRules) {
      let Model;
      switch (rule.entity) {
        case 'deal': Model = Deal; break;
        case 'lead': Model = Lead; break;
        default: continue;
      }

      // Build query from conditions
      const query = {};
      if (rule.condition) {
        query[rule.condition.field] = this.buildQueryCondition(
          rule.condition.operator,
          rule.condition.value
        );
      }

      const entities = await Model.find(query).limit(50);
      matches.push(...entities);
    }

    return matches;
  }

  buildQueryCondition(operator, value) {
    switch (operator) {
      case 'equals': return value;
      case 'greater_than': return { $gt: value };
      case 'less_than': return { $lt: value };
      case 'contains': return { $regex: value, $options: 'i' };
      default: return value;
    }
  }

  /**
   * Execute an action
   */
  async executeAction(agent, action, entity) {
    try {
      const actionRecord = {
        actionType: action.type,
        entityId: entity._id,
        entityType: entity.constructor.modelName.toLowerCase(),
        suggestion: this.generateSuggestion(action, entity),
        action: action.config,
        timestamp: new Date(),
        outcome: action.requiresApproval ? 'pending' : 'executed'
      };

      // Execute based on autonomy level
      if (agent.autonomyLevel === 'fully_autonomous' && !action.requiresApproval) {
        await this.performAction(action, entity);
        actionRecord.outcome = 'executed';
      } else if (agent.autonomyLevel === 'act_with_approval') {
        // Queue for approval
        actionRecord.outcome = 'pending';
      }

      agent.recordAction(actionRecord);
      logger.info(`Agent ${agent.name} executed action: ${action.type}`);
    } catch (error) {
      logger.error('Action execution error:', error);
    }
  }

  /**
   * Actually perform the action
   */
  async performAction(action, entity) {
    switch (action.type) {
      case 'create_task':
        const task = new Task({
          title: this.replaceVariables(action.config.title, entity),
          description: this.replaceVariables(action.config.description, entity),
          priority: action.config.priority || 'medium',
          dueDate: this.calculateDueDate(action.config.dueDate),
          assignedTo: entity.owner,
          relatedTo: entity._id,
          status: 'pending'
        });
        await task.save();
        break;

      case 'send_notification':
        // Would integrate with notification service
        logger.info(`Notification: ${action.config.message}`);
        break;

      case 'update_field':
        entity[action.config.field] = action.config.value;
        await entity.save();
        break;

      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  generateSuggestion(action, entity) {
    return `Suggested action for ${entity.name || entity.firstName}: ${action.type}`;
  }

  replaceVariables(template, entity) {
    if (!template) return '';
    return template
      .replace(/{{dealName}}/g, entity.name || '')
      .replace(/{{accountName}}/g, entity.company || entity.name || '')
      .replace(/{{leadName}}/g, `${entity.firstName} ${entity.lastName}` || '')
      .replace(/{{score}}/g, entity.aiScore?.overall || entity.score || 0);
  }

  calculateDueDate(config) {
    const now = new Date();
    switch (config) {
      case 'today': return now;
      case 'tomorrow': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '3_days': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      default: return now;
    }
  }

  /**
   * Get agent suggestions for a user
   */
  async getAgentSuggestions(userId) {
    const agents = await AIAgent.find({
      $or: [{ owner: userId }, { isGlobal: true }],
      status: 'active'
    });

    const suggestions = [];

    for (const agent of agents) {
      const pendingActions = agent.recentActions
        .filter(a => a.outcome === 'pending')
        .slice(0, 5);

      // Only include agents that have pending actions
      if (pendingActions.length > 0) {
        suggestions.push({
          agentId: agent._id,
          agentName: agent.name,
          type: agent.type,
          actions: pendingActions
        });
      }
    }

    return suggestions;
  }

  /**
   * Approve or reject agent action
   */
  async respondToAction(agentId, actionIndex, response, userId) {
    const agent = await AIAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const action = agent.recentActions[actionIndex];
    if (!action) throw new Error('Action not found');

    action.outcome = response === 'approve' ? 'executed' : 'rejected';
    action.approvedBy = userId;

    // Learn from the feedback
    agent.learn(
      action.suggestion,
      action.actionType,
      action.outcome,
      response === 'approve' ? 'positive' : 'negative'
    );

    // If approved, execute the action
    if (response === 'approve') {
      const Model = this.getModelForEntityType(action.entityType);
      const entity = await Model.findById(action.entityId);
      if (entity) {
        await this.performAction(
          { type: action.actionType, config: action.action },
          entity
        );
      }
    }

    await agent.save();
    return agent;
  }

  getModelForEntityType(type) {
    switch (type) {
      case 'deal': return Deal;
      case 'lead': return Lead;
      case 'task': return Task;
      default: return null;
    }
  }

  /**
   * Start agent monitoring (would run in background)
   */
  startAgentMonitoring() {
    setInterval(async () => {
      try {
        const agents = await AIAgent.find({ status: 'active' });
        for (const agent of agents) {
          // Check if it's time to run based on monitoring frequency
          if (this.shouldRunAgent(agent)) {
            await this.runAgentCycle(agent._id);
          }
        }
      } catch (error) {
        logger.error('Agent monitoring error:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  shouldRunAgent(agent) {
    // Simple check - would be more sophisticated in production
    return true;
  }
}

module.exports = new AgenticAIService();
