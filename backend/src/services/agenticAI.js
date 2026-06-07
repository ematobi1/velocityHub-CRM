/**
 * Agentic AI Service
 * Autonomous AI agents that monitor, learn, and act — powered by Claude
 */

const Anthropic = require('@anthropic-ai/sdk');
const AIAgent = require('../models/AIAgent');
const Deal = require('../models/Deal');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const Company = require('../models/Company');
const logger = require('../utils/logger');

const AGENT_TEMPLATES = {
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
    monitoringRules: [{ entity: 'deal', condition: { field: 'stage', operator: 'equals', value: 'negotiation' }, checkFrequency: 'daily' }],
    playbooks: [{
      name: 'Stagnant Deal Revival',
      trigger: { type: 'deal_stagnant', description: "Deal hasn't moved in 7+ days", conditions: [{ field: 'daysInStage', operator: '>', value: 7 }] },
      actions: [
        { type: 'send_notification', config: { message: '🚨 Deal {{dealName}} has been stagnant for {{days}} days. Time to take action!', recipients: ['owner'] } },
        { type: 'create_task', config: { title: 'Re-engage with {{accountName}}', description: 'This deal needs attention. Suggested actions:\n1. Schedule a call\n2. Send a value proposition email\n3. Introduce executive sponsor', priority: 'high', dueDate: 'tomorrow' } }
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
      trigger: { type: 'churn_risk_high', description: 'Customer health score drops below 40', conditions: [{ field: 'healthScore', operator: '<', value: 40 }] },
      actions: [
        { type: 'escalate', config: { to: 'customer_success_manager', urgency: 'high', message: 'Account {{accountName}} showing high churn risk. Immediate action required.' } },
        { type: 'schedule_meeting', config: { type: 'qbr', participants: ['account_owner', 'customer_success'], deadline: '3_days' } }
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
      trigger: { type: 'lead_score_high', description: 'Lead score reaches 80+', conditions: [{ field: 'aiScore', operator: '>=', value: 80 }] },
      actions: [
        { type: 'reach_out_to_rep', config: { message: '🔥 Hot lead alert! {{leadName}} just hit a score of {{score}}. Strike while the iron is hot!' } },
        { type: 'generate_proposal', config: { template: 'enterprise', customization: 'high', includeROI: true }, requiresApproval: true }
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
      trigger: { type: 'recurring_issue', description: 'Same issue reported 3+ times', conditions: [{ field: 'issueCount', operator: '>=', value: 3 }] },
      actions: [
        { type: 'create_task', config: { title: 'Address recurring issue: {{issueType}}', assignTo: 'product_team', priority: 'high' } }
      ],
      priority: 2
    }]
  },

  customer_success: {
    name: 'Customer Success AI',
    type: 'customer_success',
    description: 'Ensures customers achieve their goals and maximize value',
    capabilities: [
      { action: 'monitor_pipeline', enabled: true },
      { action: 'analyze_patterns', enabled: true },
      { action: 'suggest_actions', enabled: true },
      { action: 'schedule_meetings', enabled: true },
      { action: 'send_notifications', enabled: true }
    ],
    autonomyLevel: 'act_with_approval',
    playbooks: [{
      name: 'Onboarding Completion',
      trigger: { type: 'onboarding_incomplete', description: 'Customer not fully onboarded after 14 days', conditions: [{ field: 'onboardingProgress', operator: '<', value: 80 }] },
      actions: [
        { type: 'send_notification', config: { message: 'Customer {{accountName}} needs onboarding support. Schedule a check-in call.', recipients: ['csm'] } },
        { type: 'create_task', config: { title: 'Complete onboarding for {{accountName}}', priority: 'high', dueDate: '3_days' } }
      ],
      priority: 1
    }]
  },

  renewal_specialist: {
    name: 'Renewal Specialist AI',
    type: 'renewal_specialist',
    description: 'Manages renewal pipeline and maximizes retention revenue',
    capabilities: [
      { action: 'monitor_pipeline', enabled: true },
      { action: 'predict_churn', enabled: true },
      { action: 'suggest_actions', enabled: true },
      { action: 'generate_content', enabled: true },
      { action: 'trigger_workflows', enabled: true }
    ],
    autonomyLevel: 'act_with_approval',
    playbooks: [{
      name: 'Renewal Early Warning',
      trigger: { type: 'renewal_approaching', description: 'Contract renews within 60 days', conditions: [{ field: 'daysToRenewal', operator: '<', value: 60 }] },
      actions: [
        { type: 'create_task', config: { title: 'Start renewal conversation with {{accountName}}', priority: 'high', dueDate: '7_days' } },
        { type: 'generate_proposal', config: { template: 'renewal', includeUsageStats: true, includeROI: true }, requiresApproval: true }
      ],
      priority: 1
    }]
  },

  cross_sell_advisor: {
    name: 'Cross-Sell Advisor AI',
    type: 'cross_sell_advisor',
    description: 'Identifies cross-sell and upsell opportunities to grow revenue',
    capabilities: [
      { action: 'analyze_patterns', enabled: true },
      { action: 'suggest_actions', enabled: true },
      { action: 'generate_content', enabled: true },
      { action: 'trigger_workflows', enabled: true }
    ],
    autonomyLevel: 'suggest_only',
    playbooks: [{
      name: 'Upsell Opportunity Detection',
      trigger: { type: 'upsell_signal', description: 'Customer usage approaching plan limits', conditions: [{ field: 'usagePercent', operator: '>=', value: 80 }] },
      actions: [
        { type: 'reach_out_to_rep', config: { message: '💰 Upsell opportunity detected. Present upgrade options.', suggestedActions: ['Present usage report', 'Demo premium features', 'Prepare upgrade proposal'] } },
        { type: 'create_task', config: { title: 'Upsell outreach to {{accountName}}', priority: 'medium', dueDate: 'tomorrow' } }
      ],
      priority: 2
    }]
  },

  account_health_monitor: {
    name: 'Account Health Monitor',
    type: 'account_health_monitor',
    description: 'Continuously monitors account health and flags at-risk accounts',
    capabilities: [
      { action: 'monitor_pipeline', enabled: true },
      { action: 'predict_churn', enabled: true },
      { action: 'analyze_sentiment', enabled: true },
      { action: 'escalate_issues', enabled: true },
      { action: 'update_records', enabled: true }
    ],
    autonomyLevel: 'act_with_approval',
    playbooks: [{
      name: 'At-Risk Account Alert',
      trigger: { type: 'health_score_drop', description: 'Account health score drops more than 20 points', conditions: [{ field: 'healthScoreDelta', operator: '<', value: -20 }] },
      actions: [
        { type: 'escalate', config: { to: 'account_manager', urgency: 'high', message: 'Account health dropped significantly. Immediate intervention needed.' } },
        { type: 'create_task', config: { title: 'Account health recovery plan for {{accountName}}', priority: 'high', dueDate: 'today' } }
      ],
      priority: 1
    }]
  },

  pipeline_optimizer: {
    name: 'Pipeline Optimizer AI',
    type: 'pipeline_optimizer',
    description: 'Analyzes and optimizes the entire sales pipeline for maximum efficiency',
    capabilities: [
      { action: 'monitor_pipeline', enabled: true },
      { action: 'analyze_patterns', enabled: true },
      { action: 'suggest_actions', enabled: true },
      { action: 'create_tasks', enabled: true },
      { action: 'trigger_workflows', enabled: true }
    ],
    autonomyLevel: 'suggest_only',
    monitoringRules: [{ entity: 'deal', condition: { field: 'stage', operator: 'not_equals', value: 'closed_won' }, checkFrequency: 'daily' }],
    playbooks: [{
      name: 'Pipeline Health Check',
      trigger: { type: 'pipeline_review', description: 'Weekly pipeline analysis', conditions: [] },
      actions: [
        { type: 'send_notification', config: { message: '📊 Weekly pipeline review ready. Analyze deals at risk.', recipients: ['owner'] } }
      ],
      priority: 3
    }]
  }
};

class AgenticAIService {
  constructor() {
    this.runningAgents = new Map();
    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  async createAgentFromTemplate(templateName, userId) {
    const template = AGENT_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const agent = new AIAgent({
      ...template,
      owner: userId,
      status: 'active',
      aiModel: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        temperature: 0.4,
        systemPrompt: `You are ${template.name}. ${template.description}. Always provide actionable, specific recommendations based on real CRM data.`
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

  async runAgentCycle(agentId) {
    try {
      const agent = await AIAgent.findById(agentId);
      if (!agent || agent.status !== 'active') return;

      logger.info(`Running cycle for agent: ${agent.name} (${agent.type})`);

      if (this.anthropic) {
        await this.runClaudeAnalysis(agent);
      } else {
        for (const playbook of agent.playbooks) {
          await this.executePlaybook(agent, playbook);
        }
      }

      await agent.save();
    } catch (error) {
      logger.error('Agent cycle error:', error);
    }
  }

  async runClaudeAnalysis(agent) {
    try {
      const crmData = await this.fetchCRMData(agent);
      const suggestions = await this.generateAISuggestions(agent, crmData);

      for (const suggestion of suggestions) {
        const actionRecord = {
          actionType: suggestion.actionType,
          entityId: suggestion.entityId || null,
          entityType: suggestion.entityType || 'general',
          suggestion: suggestion.suggestion,
          action: suggestion.config || {},
          timestamp: new Date(),
          outcome: suggestion.requiresApproval === false && agent.autonomyLevel === 'fully_autonomous'
            ? 'executed'
            : 'pending'
        };

        agent.recordAction(actionRecord);

        if (actionRecord.outcome === 'executed' && suggestion.actionType === 'create_task') {
          await this.createTaskFromSuggestion(suggestion, agent.owner);
        }
      }

      if (suggestions.length > 0) {
        agent.performanceMetrics.impactScore = Math.min(100,
          agent.performanceMetrics.impactScore + suggestions.length);
      }
    } catch (error) {
      logger.error(`Claude analysis failed for agent ${agent.name}:`, error.message);
      for (const playbook of agent.playbooks) {
        await this.executePlaybook(agent, playbook);
      }
    }
  }

  async fetchCRMData(agent) {
    const ownerId = agent.owner;
    const data = { deals: [], leads: [] };

    try {
      data.deals = await Deal.find({ owner: ownerId })
        .select('name stage value probability createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();
    } catch (e) { /* model may not exist */ }

    try {
      data.leads = await Lead.find({ owner: ownerId })
        .select('firstName lastName email status source aiScore createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();
    } catch (e) { /* model may not exist */ }

    return data;
  }

  async generateAISuggestions(agent, crmData) {
    const typeContext = {
      deal_coach: 'Focus on stagnant deals (no updates in 7+ days), deals stuck in negotiation, and deals at risk of being lost.',
      churn_prevention: 'Focus on customers showing disengagement patterns or missing recent interaction.',
      lead_conversion: 'Focus on high-scoring leads needing follow-up and leads with recent engagement signals.',
      support_assistant: 'Focus on unresolved issues, recurring complaints, and customers needing technical assistance.',
      customer_success: 'Focus on customer health, onboarding progress, and value realization.',
      renewal_specialist: 'Focus on upcoming renewals, contract expiry, and retention risks.',
      cross_sell_advisor: 'Focus on customers ready for upgrades or complementary product offerings.',
      account_health_monitor: 'Focus on account health trends, engagement levels, and early warning signals.',
      pipeline_optimizer: 'Focus on pipeline velocity, conversion rate bottlenecks, and deals needing attention.'
    };

    const now = new Date();
    const dealsText = crmData.deals.length > 0
      ? crmData.deals.map(d => {
          const daysSinceUpdate = Math.floor((now - new Date(d.updatedAt)) / (1000 * 60 * 60 * 24));
          return `- "${d.name}" [id:${d._id}] stage=${d.stage} value=$${d.value || 0} prob=${d.probability || 0}% days_since_update=${daysSinceUpdate}`;
        }).join('\n')
      : 'No deals found.';

    const leadsText = crmData.leads.length > 0
      ? crmData.leads.map(l => {
          const daysSinceCreate = Math.floor((now - new Date(l.createdAt)) / (1000 * 60 * 60 * 24));
          return `- ${l.firstName} ${l.lastName} [id:${l._id}] status=${l.status} score=${l.aiScore?.overall || 0} days_old=${daysSinceCreate}`;
        }).join('\n')
      : 'No leads found.';

    const prompt = `You are ${agent.name}, an autonomous CRM AI agent.
Role: ${agent.description}
Today: ${now.toISOString().split('T')[0]}

${typeContext[agent.type] || 'Analyze the CRM data and provide actionable recommendations.'}

DEALS (${crmData.deals.length} total):
${dealsText}

LEADS (${crmData.leads.length} total):
${leadsText}

Identify the 3-5 most important actions to take. Be specific. Reference actual records by their [id:xxx].

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "entityType": "deal",
      "entityId": "paste_the_id_here",
      "actionType": "create_task",
      "suggestion": "Specific actionable recommendation (1-2 sentences explaining what to do and why)",
      "priority": "high",
      "requiresApproval": true,
      "config": { "title": "Task title", "priority": "high", "dueDate": "tomorrow" }
    }
  ]
}

actionType must be one of: create_task, send_notification, escalate, schedule_meeting, reach_out_to_rep
If there is nothing important to act on, return {"suggestions": []}.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0]?.text || '{"suggestions":[]}';

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      logger.warn(`Failed to parse Claude suggestions for ${agent.name}:`, text.slice(0, 200));
      return [];
    }

    const rawSuggestions = parsed.suggestions || [];
    const validEntityIds = new Set([
      ...crmData.deals.map(d => d._id.toString()),
      ...crmData.leads.map(l => l._id.toString())
    ]);

    return rawSuggestions
      .filter(s => s.suggestion && s.actionType)
      .map(s => ({
        entityType: s.entityType || 'general',
        entityId: s.entityId && validEntityIds.has(s.entityId) ? s.entityId : null,
        actionType: s.actionType,
        suggestion: `[${agent.name}] ${s.suggestion}`,
        priority: s.priority || 'medium',
        requiresApproval: s.requiresApproval !== false,
        config: s.config || {}
      }))
      .slice(0, 5);
  }

  async createTaskFromSuggestion(suggestion, ownerId) {
    try {
      const task = new Task({
        title: suggestion.config?.title || suggestion.suggestion.slice(0, 80),
        description: suggestion.config?.description || suggestion.suggestion,
        priority: suggestion.config?.priority || suggestion.priority || 'medium',
        dueDate: this.calculateDueDate(suggestion.config?.dueDate || 'tomorrow'),
        assignedTo: ownerId,
        relatedTo: suggestion.entityId || undefined,
        status: 'pending'
      });
      await task.save();
    } catch (error) {
      logger.warn('Could not create task from suggestion:', error.message);
    }
  }

  async executePlaybook(agent, playbook) {
    try {
      const matches = await this.findMatchingEntities(agent, playbook.trigger);

      for (const match of matches) {
        const recentAction = agent.recentActions.find(
          a => a.entityId && a.entityId.toString() === match._id.toString() &&
               Date.now() - new Date(a.timestamp).getTime() < 24 * 60 * 60 * 1000
        );

        if (recentAction) continue;

        for (const action of playbook.actions) {
          await this.executeAction(agent, action, match);
        }
      }
    } catch (error) {
      logger.error('Playbook execution error:', error);
    }
  }

  async findMatchingEntities(agent, trigger) {
    const matches = [];

    for (const rule of (agent.monitoringRules || [])) {
      let Model;
      switch (rule.entity) {
        case 'deal': Model = Deal; break;
        case 'lead': Model = Lead; break;
        default: continue;
      }

      const query = {};
      if (rule.condition) {
        query[rule.condition.field] = this.buildQueryCondition(rule.condition.operator, rule.condition.value);
      }

      try {
        const entities = await Model.find(query).limit(50);
        matches.push(...entities);
      } catch (e) { /* skip */ }
    }

    return matches;
  }

  buildQueryCondition(operator, value) {
    switch (operator) {
      case 'equals': return value;
      case 'not_equals': return { $ne: value };
      case 'greater_than': return { $gt: value };
      case 'less_than': return { $lt: value };
      case 'contains': return { $regex: value, $options: 'i' };
      default: return value;
    }
  }

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

      if (agent.autonomyLevel === 'fully_autonomous' && !action.requiresApproval) {
        await this.performAction(action, entity);
        actionRecord.outcome = 'executed';
      } else if (agent.autonomyLevel === 'act_with_approval') {
        actionRecord.outcome = 'pending';
      }

      agent.recordAction(actionRecord);
    } catch (error) {
      logger.error('Action execution error:', error);
    }
  }

  async performAction(action, entity) {
    switch (action.type) {
      case 'create_task': {
        const task = new Task({
          title: this.replaceVariables(action.config.title, entity),
          description: this.replaceVariables(action.config.description || '', entity),
          priority: action.config.priority || 'medium',
          dueDate: this.calculateDueDate(action.config.dueDate),
          assignedTo: entity.owner,
          relatedTo: entity._id,
          status: 'pending'
        });
        await task.save();
        break;
      }
      case 'send_notification':
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
    const name = entity.name || (entity.firstName ? `${entity.firstName} ${entity.lastName}` : 'entity');
    return `Suggested action for ${name}: ${action.type.replace(/_/g, ' ')}`;
  }

  replaceVariables(template, entity) {
    if (!template) return '';
    return template
      .replace(/{{dealName}}/g, entity.name || '')
      .replace(/{{accountName}}/g, entity.company || entity.name || '')
      .replace(/{{leadName}}/g, entity.firstName ? `${entity.firstName} ${entity.lastName}` : '')
      .replace(/{{score}}/g, entity.aiScore?.overall || entity.score || 0)
      .replace(/{{days}}/g, '7+');
  }

  calculateDueDate(config) {
    const now = new Date();
    switch (config) {
      case 'today': return now;
      case 'tomorrow': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '3_days': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case '7_days': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  async getAgentSuggestions(userId) {
    const agents = await AIAgent.find({
      $or: [{ owner: userId }, { isGlobal: true }],
      status: 'active'
    });

    const suggestions = [];

    for (const agent of agents) {
      const pendingActions = [];
      agent.recentActions.forEach((a, originalIndex) => {
        if (a.outcome === 'pending' && pendingActions.length < 5) {
          pendingActions.push({ ...a.toObject(), actionIndex: originalIndex });
        }
      });

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

  async respondToAction(agentId, actionIndex, response, userId) {
    const agent = await AIAgent.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const action = agent.recentActions[actionIndex];
    if (!action) throw new Error('Action not found');

    action.outcome = response === 'approve' ? 'executed' : 'rejected';
    action.approvedBy = userId;

    agent.learn(
      action.suggestion,
      action.actionType,
      action.outcome,
      response === 'approve' ? 'positive' : 'negative'
    );

    if (response === 'approve' && action.actionType === 'create_task') {
      await this.createTaskFromSuggestion({
        suggestion: action.suggestion,
        config: action.action,
        entityId: action.entityId
      }, userId);
    } else if (response === 'approve') {
      const Model = this.getModelForEntityType(action.entityType);
      if (Model && action.entityId) {
        try {
          const entity = await Model.findById(action.entityId);
          if (entity) {
            await this.performAction({ type: action.actionType, config: action.action }, entity);
          }
        } catch (e) { /* entity may have been deleted */ }
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

  startAgentMonitoring() {
    setInterval(async () => {
      try {
        const agents = await AIAgent.find({ status: 'active' });
        for (const agent of agents) {
          await this.runAgentCycle(agent._id);
        }
      } catch (error) {
        logger.error('Agent monitoring error:', error);
      }
    }, 60 * 60 * 1000);
  }
}

module.exports = new AgenticAIService();
