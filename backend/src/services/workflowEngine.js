/**
 * Workflow Automation Engine
 * Executes workflow automations based on triggers
 */

const Workflow = require('../models/Workflow');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Task = require('../models/Task');
const Company = require('../models/Company');
const logger = require('../utils/logger');

class WorkflowEngine {
  constructor() {
    this.models = {
      lead: Lead,
      contact: Contact,
      deal: Deal,
      task: Task,
      company: Company,
    };
  }

  /**
   * Process a workflow trigger
   */
  async processTrigger(triggerType, entity, recordId, changeData = {}) {
    try {
      // Find all active workflows for this trigger
      const workflows = await Workflow.find({
        entity,
        'trigger.type': triggerType,
        status: 'active',
      });

      logger.info(`Found ${workflows.length} workflows for trigger ${triggerType} on ${entity}`);

      // Execute each workflow
      for (const workflow of workflows) {
        if (workflow.canExecute()) {
          await this.executeWorkflow(workflow, recordId, changeData);
        }
      }
    } catch (error) {
      logger.error('Workflow trigger processing error:', error);
    }
  }

  /**
   * Execute a single workflow
   */
  async executeWorkflow(workflow, recordId, changeData = {}) {
    const startTime = Date.now();
    let success = true;
    let actionsCompleted = 0;
    let actionsFailed = 0;
    let error = null;

    try {
      logger.info(`Executing workflow ${workflow.name} for record ${recordId}`);

      // Get the record
      const Model = this.models[workflow.entity];
      const record = await Model.findById(recordId);

      if (!record) {
        throw new Error(`Record ${recordId} not found`);
      }

      // Check if workflow should run for this record
      if (!this.shouldExecute(workflow, record, changeData)) {
        logger.info(`Workflow ${workflow.name} conditions not met for record ${recordId}`);
        return;
      }

      // Check if record has already been processed (if runOnce is true)
      if (workflow.settings.runOnce) {
        const alreadyProcessed = workflow.recentExecutions.some(
          (e) => e.recordId.toString() === recordId.toString() && e.status === 'success'
        );

        if (alreadyProcessed) {
          logger.info(`Record ${recordId} already processed by workflow ${workflow.name}`);
          return;
        }
      }

      // Sort actions by order
      const sortedActions = workflow.actions.sort((a, b) => a.order - b.order);

      // Execute each action
      for (const action of sortedActions) {
        try {
          // Check if action has conditional execution
          if (action.condition && !this.evaluateCondition(action.condition, record)) {
            logger.info(`Skipping action ${action.type} - condition not met`);
            continue;
          }

          // Wait action
          if (action.type === 'wait') {
            await this.executeWaitAction(action);
          } else {
            await this.executeAction(action, record);
          }

          actionsCompleted++;
        } catch (actionError) {
          logger.error(`Action ${action.type} failed:`, actionError);
          actionsFailed++;
          error = actionError.message;
        }
      }

      // Update workflow statistics
      const executionTime = Date.now() - startTime;
      workflow.incrementStats(success, executionTime);

      // Add execution to history
      workflow.addExecution({
        recordId,
        recordType: workflow.entity,
        executedAt: new Date(),
        status: actionsFailed > 0 ? 'partial' : 'success',
        actionsCompleted,
        actionsFailed,
        error,
        executionTime,
      });

      await workflow.save();

      logger.info(`Workflow ${workflow.name} executed successfully in ${executionTime}ms`);
    } catch (error) {
      logger.error(`Workflow ${workflow.name} execution failed:`, error);
      success = false;

      const executionTime = Date.now() - startTime;
      workflow.incrementStats(false, executionTime);
      workflow.addExecution({
        recordId,
        recordType: workflow.entity,
        executedAt: new Date(),
        status: 'failed',
        actionsCompleted,
        actionsFailed: workflow.actions.length,
        error: error.message,
        executionTime,
      });

      await workflow.save();
    }
  }

  /**
   * Check if workflow should execute for this record
   */
  shouldExecute(workflow, record, changeData) {
    // Check trigger conditions
    if (workflow.trigger.conditions && workflow.trigger.conditions.length > 0) {
      for (const condition of workflow.trigger.conditions) {
        if (!this.evaluateCondition(condition, record, changeData)) {
          return false;
        }
      }
    }

    // Check filters
    if (workflow.filters && workflow.filters.length > 0) {
      let result = true;

      for (const filter of workflow.filters) {
        const conditionMet = this.evaluateCondition(filter, record);

        if (filter.logicalOperator === 'OR') {
          result = result || conditionMet;
        } else {
          result = result && conditionMet;
        }
      }

      if (!result) return false;
    }

    // Check stop conditions
    if (workflow.settings.stopOn && workflow.settings.stopOn.length > 0) {
      for (const stopCondition of workflow.settings.stopOn) {
        if (this.evaluateCondition(stopCondition, record)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition, record, changeData = {}) {
    const fieldValue = this.getFieldValue(record, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue == conditionValue;

      case 'not_equals':
        return fieldValue != conditionValue;

      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());

      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());

      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);

      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);

      case 'is_empty':
        return !fieldValue || fieldValue === '';

      case 'is_not_empty':
        return fieldValue && fieldValue !== '';

      case 'changed_to':
        return changeData.field === condition.field && changeData.newValue == conditionValue;

      case 'changed_from':
        return changeData.field === condition.field && changeData.oldValue == conditionValue;

      default:
        return true;
    }
  }

  /**
   * Get field value from record (supports nested paths)
   */
  getFieldValue(record, fieldPath) {
    if (!fieldPath) return null;

    const parts = fieldPath.split('.');
    let value = record;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Execute a specific action
   */
  async executeAction(action, record) {
    logger.info(`Executing action: ${action.type}`);

    switch (action.type) {
      case 'update_field':
        await this.updateFieldAction(action, record);
        break;

      case 'send_email':
        await this.sendEmailAction(action, record);
        break;

      case 'send_sms':
        await this.sendSMSAction(action, record);
        break;

      case 'create_task':
        await this.createTaskAction(action, record);
        break;

      case 'create_deal':
        await this.createDealAction(action, record);
        break;

      case 'add_tag':
        await this.addTagAction(action, record);
        break;

      case 'remove_tag':
        await this.removeTagAction(action, record);
        break;

      case 'assign_owner':
        await this.assignOwnerAction(action, record);
        break;

      case 'change_stage':
        await this.changeStageAction(action, record);
        break;

      case 'update_score':
        await this.updateScoreAction(action, record);
        break;

      case 'create_activity':
        await this.createActivityAction(action, record);
        break;

      case 'send_notification':
        await this.sendNotificationAction(action, record);
        break;

      case 'webhook':
        await this.webhookAction(action, record);
        break;

      case 'add_to_sequence':
        await this.addToSequenceAction(action, record);
        break;

      case 'create_note':
        await this.createNoteAction(action, record);
        break;

      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  // Action implementations

  async updateFieldAction(action, record) {
    const { field, value } = action.config;
    const parts = field.split('.');

    let target = record;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }

    target[parts[parts.length - 1]] = value;
    await record.save();
  }

  async sendEmailAction(action, record) {
    const nodemailer = require('nodemailer');
    const { recipient, subject, body } = action.config;

    // Check if email service is configured
    if (!process.env.SMTP_HOST) {
      logger.warn('Email service not configured, skipping email send');
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const emailRecipient = this.replaceVariables(recipient, record);
      const emailSubject = this.replaceVariables(subject, record);
      const emailBody = this.replaceVariables(body, record);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@velocityhub.com',
        to: emailRecipient,
        subject: emailSubject,
        html: emailBody,
      });

      logger.info(`Email sent successfully to ${emailRecipient}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendSMSAction(action, record) {
    const { message, to } = action.config;

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio not configured, skipping SMS send');
      return;
    }

    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      const phoneNumber = to || record.phone;
      if (!phoneNumber) {
        logger.warn('No phone number available for SMS');
        return;
      }

      const smsMessage = this.replaceVariables(message, record);

      await client.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      logger.info(`SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  async createTaskAction(action, record) {
    const { taskTitle, taskDescription, taskDueDate, taskPriority } = action.config;

    const dueDate = this.calculateDueDate(taskDueDate);

    const task = new Task({
      title: this.replaceVariables(taskTitle, record),
      description: this.replaceVariables(taskDescription, record),
      dueDate,
      priority: taskPriority || 'medium',
      assignedTo: record.owner || null,
      lead: record._id,
      status: 'pending',
    });

    await task.save();
    logger.info(`Created task: ${task.title}`);
  }

  async createDealAction(action, record) {
    const { dealName, dealValue, dealStage } = action.config;

    const deal = new Deal({
      name: this.replaceVariables(dealName, record),
      value: dealValue,
      stage: dealStage || 'prospecting',
      lead: record._id,
      owner: record.owner,
    });

    await deal.save();
    logger.info(`Created deal: ${deal.name}`);
  }

  async addTagAction(action, record) {
    const { tags } = action.config;

    if (!record.tags) record.tags = [];

    tags.forEach((tag) => {
      if (!record.tags.includes(tag)) {
        record.tags.push(tag);
      }
    });

    await record.save();
  }

  async removeTagAction(action, record) {
    const { tags } = action.config;

    if (record.tags) {
      record.tags = record.tags.filter((tag) => !tags.includes(tag));
      await record.save();
    }
  }

  async assignOwnerAction(action, record) {
    const { assignmentType, ownerId, teamId } = action.config;
    const User = require('../models/User');

    if (assignmentType === 'specific' && ownerId) {
      record.owner = ownerId;
      await record.save();
      return;
    }

    if (assignmentType === 'round_robin' && teamId) {
      // Get all active users in the team
      const users = await User.find({ team: teamId, isActive: true }).sort({ lastAssignedAt: 1 });

      if (users.length > 0) {
        const assignedUser = users[0];
        record.owner = assignedUser._id;
        assignedUser.lastAssignedAt = new Date();
        await Promise.all([record.save(), assignedUser.save()]);
        logger.info(`Assigned to ${assignedUser.email} via round-robin`);
      }
    }

    if (assignmentType === 'least_loaded' && teamId) {
      // Get users with their current lead/deal counts
      const users = await User.find({ team: teamId, isActive: true });
      const Lead = require('../models/Lead');
      const Deal = require('../models/Deal');

      let leastLoadedUser = null;
      let minCount = Infinity;

      for (const user of users) {
        const leadCount = await Lead.countDocuments({
          owner: user._id,
          status: { $nin: ['converted', 'lost'] },
        });
        const dealCount = await Deal.countDocuments({
          owner: user._id,
          stage: { $nin: ['closed_won', 'closed_lost'] },
        });
        const totalCount = leadCount + dealCount;

        if (totalCount < minCount) {
          minCount = totalCount;
          leastLoadedUser = user;
        }
      }

      if (leastLoadedUser) {
        record.owner = leastLoadedUser._id;
        await record.save();
        logger.info(
          `Assigned to ${leastLoadedUser.email} via least-loaded (${minCount} active records)`
        );
      }
    }
  }

  async changeStageAction(action, record) {
    const { newStage } = action.config;
    record.stage = newStage;
    await record.save();
  }

  async updateScoreAction(action, record) {
    const { scoreChange } = action.config;

    if (record.aiScore !== undefined) {
      record.aiScore.overall = Math.max(0, Math.min(100, record.aiScore.overall + scoreChange));
      await record.save();
    }
  }

  async createActivityAction(action, record) {
    const { activityType, activityNotes, activityDuration } = action.config;

    // Create activity log (you may need to create an Activity model if not exists)
    const activityData = {
      type: activityType || 'note',
      entityType: record.constructor.modelName.toLowerCase(),
      entityId: record._id,
      userId: record.owner,
      notes: this.replaceVariables(activityNotes, record),
      duration: activityDuration,
      timestamp: new Date(),
    };

    // Store in record's activity array or separate collection
    if (!record.activities) record.activities = [];
    record.activities.push(activityData);
    await record.save();

    logger.info(`Created ${activityType} activity for record ${record._id}`);
  }

  async sendNotificationAction(action, record) {
    const { notificationMessage, notificationTitle, notificationType, recipientId } = action.config;
    const io = require('../server').io; // Socket.io instance

    const notification = {
      title: this.replaceVariables(notificationTitle || 'Notification', record),
      message: this.replaceVariables(notificationMessage, record),
      type: notificationType || 'info',
      entityType: record.constructor.modelName.toLowerCase(),
      entityId: record._id,
      timestamp: new Date(),
      read: false,
    };

    const recipient = recipientId || record.owner;

    // Emit to specific user via socket.io
    if (io) {
      io.to(`user_${recipient}`).emit('notification', notification);
    }

    // Store notification in database for persistence
    if (!record.notifications) record.notifications = [];
    record.notifications.push(notification);
    await record.save();

    logger.info(`Sent notification to user ${recipient}: ${notificationMessage}`);
  }

  async webhookAction(action, record) {
    const axios = require('axios');
    const { webhookUrl, webhookMethod, webhookHeaders, webhookBody } = action.config;

    try {
      const url = this.replaceVariables(webhookUrl, record);
      const method = webhookMethod || 'POST';
      const headers = webhookHeaders || { 'Content-Type': 'application/json' };

      // Build request body with record data
      let body = webhookBody || record.toObject();
      if (typeof body === 'string') {
        body = this.replaceVariables(body, record);
        try {
          body = JSON.parse(body);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      const response = await axios({
        method,
        url,
        headers,
        data: body,
        timeout: 10000, // 10 second timeout
      });

      logger.info(`Webhook called successfully: ${method} ${url} (Status: ${response.status})`);
      return response.data;
    } catch (error) {
      logger.error(`Webhook failed: ${error.message}`);
      throw error;
    }
  }

  async addToSequenceAction(action, record) {
    const EmailSequence = require('../models/EmailSequence');
    const { sequenceId, startDelay } = action.config;

    try {
      const sequence = await EmailSequence.findById(sequenceId);
      if (!sequence) {
        logger.warn(`Email sequence ${sequenceId} not found`);
        return;
      }

      // Add record to sequence subscribers
      if (!sequence.subscribers) sequence.subscribers = [];

      const existingSubscriber = sequence.subscribers.find(
        (sub) => sub.entityId.toString() === record._id.toString()
      );

      if (!existingSubscriber) {
        sequence.subscribers.push({
          entityType: record.constructor.modelName.toLowerCase(),
          entityId: record._id,
          email: record.email,
          status: 'active',
          currentStep: 0,
          startedAt: new Date(Date.now() + (startDelay || 0) * 60 * 60 * 1000), // Delay in hours
        });

        await sequence.save();
        logger.info(`Added record ${record._id} to email sequence ${sequenceId}`);
      } else {
        logger.info(`Record ${record._id} already in sequence ${sequenceId}`);
      }
    } catch (error) {
      logger.error('Failed to add to sequence:', error);
      throw error;
    }
  }

  async createNoteAction(action, record) {
    // TODO: Create note
    if (!record.notes) record.notes = [];
    record.notes.push({
      content: this.replaceVariables(action.config.noteContent, record),
      createdAt: new Date(),
    });
    await record.save();
  }

  async executeWaitAction(action) {
    const { waitDuration, waitUnit } = action.config;

    // For real implementation, this should be async/scheduled
    logger.info(`Would wait ${waitDuration} ${waitUnit}`);
  }

  // Helper methods

  calculateDueDate(dueDateConfig) {
    const now = new Date();

    switch (dueDateConfig) {
      case 'immediate':
        return now;
      case 'in_1_day':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'in_3_days':
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case 'in_1_week':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }

  replaceVariables(template, record) {
    if (!template) return '';

    let result = template;

    // Replace common variables
    const replacements = {
      '{{firstName}}': record.firstName || '',
      '{{lastName}}': record.lastName || '',
      '{{email}}': record.email || '',
      '{{company}}': record.company || '',
      '{{phone}}': record.phone || '',
    };

    Object.keys(replacements).forEach((key) => {
      result = result.replace(new RegExp(key, 'g'), replacements[key]);
    });

    return result;
  }

  /**
   * Run scheduled workflows (called by cron job)
   */
  async runScheduledWorkflows() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay();
      const currentDate = now.getDate();

      const scheduledWorkflows = await Workflow.find({
        status: 'active',
        'trigger.type': 'time_based',
      });

      for (const workflow of scheduledWorkflows) {
        const schedule = workflow.trigger.schedule;

        let shouldRun = false;

        switch (schedule.frequency) {
          case 'hourly':
            shouldRun = true;
            break;

          case 'daily':
            if (schedule.time) {
              const [hour, minute] = schedule.time.split(':');
              shouldRun = currentHour === parseInt(hour) && currentMinute === parseInt(minute);
            }
            break;

          case 'weekly':
            if (schedule.dayOfWeek === currentDay && schedule.time) {
              const [hour, minute] = schedule.time.split(':');
              shouldRun = currentHour === parseInt(hour) && currentMinute === parseInt(minute);
            }
            break;

          case 'monthly':
            if (schedule.dayOfMonth === currentDate && schedule.time) {
              const [hour, minute] = schedule.time.split(':');
              shouldRun = currentHour === parseInt(hour) && currentMinute === parseInt(minute);
            }
            break;
        }

        if (shouldRun) {
          // Find all records that match the workflow filters
          const Model = this.models[workflow.entity];
          const records = await Model.find();

          for (const record of records) {
            await this.executeWorkflow(workflow, record._id);
          }
        }
      }
    } catch (error) {
      logger.error('Scheduled workflow execution error:', error);
    }
  }

  /**
   * Check for inactive records and trigger workflows
   */
  async checkInactivity() {
    try {
      const inactivityWorkflows = await Workflow.find({
        status: 'active',
        'trigger.type': 'inactivity',
      });

      const now = new Date();

      for (const workflow of inactivityWorkflows) {
        const inactivityDays = workflow.trigger.inactivityDays || 7;
        const thresholdDate = new Date(now.getTime() - inactivityDays * 24 * 60 * 60 * 1000);

        const Model = this.models[workflow.entity];
        const inactiveRecords = await Model.find({
          updatedAt: { $lt: thresholdDate },
        });

        for (const record of inactiveRecords) {
          await this.executeWorkflow(workflow, record._id);
        }
      }
    } catch (error) {
      logger.error('Inactivity check error:', error);
    }
  }
}

module.exports = new WorkflowEngine();
