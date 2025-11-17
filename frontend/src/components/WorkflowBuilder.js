import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiZap, FiSettings, FiCheck } from 'react-icons/fi';

const TRIGGER_TYPES = [
  { value: 'record_created', label: 'Record Created' },
  { value: 'record_updated', label: 'Record Updated' },
  { value: 'field_changed', label: 'Field Changed' },
  { value: 'score_threshold', label: 'Score Threshold' },
  { value: 'time_based', label: 'Time Based' }
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: '📧' },
  { value: 'send_sms', label: 'Send SMS', icon: '💬' },
  { value: 'create_task', label: 'Create Task', icon: '✓' },
  { value: 'create_deal', label: 'Create Deal', icon: '💼' },
  { value: 'add_tag', label: 'Add Tag', icon: '🏷️' },
  { value: 'remove_tag', label: 'Remove Tag', icon: '🗑️' },
  { value: 'assign_owner', label: 'Assign Owner', icon: '👤' },
  { value: 'change_stage', label: 'Change Stage', icon: '🔄' },
  { value: 'update_score', label: 'Update Score', icon: '📊' },
  { value: 'send_notification', label: 'Send Notification', icon: '🔔' },
  { value: 'webhook', label: 'Call Webhook', icon: '🔗' },
  { value: 'add_to_sequence', label: 'Add to Sequence', icon: '📨' }
];

const ENTITIES = ['lead', 'deal', 'contact', 'company'];

const WorkflowBuilder = ({ onSave, onCancel, initialData = null }) => {
  const [workflow, setWorkflow] = useState(initialData || {
    name: '',
    description: '',
    entity: 'lead',
    trigger: {
      type: 'record_created',
      conditions: []
    },
    actions: []
  });

  const [showActionPicker, setShowActionPicker] = useState(false);

  const handleChange = (field, value) => {
    setWorkflow(prev => ({ ...prev, [field]: value }));
  };

  const handleTriggerChange = (field, value) => {
    setWorkflow(prev => ({
      ...prev,
      trigger: { ...prev.trigger, [field]: value }
    }));
  };

  const addCondition = () => {
    setWorkflow(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: [
          ...prev.trigger.conditions,
          { field: '', operator: 'equals', value: '' }
        ]
      }
    }));
  };

  const updateCondition = (index, field, value) => {
    setWorkflow(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: prev.trigger.conditions.map((cond, i) =>
          i === index ? { ...cond, [field]: value } : cond
        )
      }
    }));
  };

  const removeCondition = (index) => {
    setWorkflow(prev => ({
      ...prev,
      trigger: {
        ...prev.trigger,
        conditions: prev.trigger.conditions.filter((_, i) => i !== index)
      }
    }));
  };

  const addAction = (actionType) => {
    const newAction = {
      type: actionType,
      config: getDefaultConfig(actionType)
    };
    setWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
    setShowActionPicker(false);
  };

  const updateAction = (index, config) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, config } : action
      )
    }));
  };

  const removeAction = (index) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const getDefaultConfig = (actionType) => {
    switch (actionType) {
      case 'send_email':
        return { subject: '', body: '', recipient: '{{email}}' };
      case 'send_sms':
        return { message: '', phone: '{{phone}}' };
      case 'create_task':
        return { taskTitle: '', taskDescription: '', taskDueDate: '1_day', taskPriority: 'medium' };
      case 'create_deal':
        return { dealName: '{{name}} - New Deal', dealValue: 0, dealStage: 'prospecting' };
      case 'add_tag':
        return { tags: [] };
      case 'remove_tag':
        return { tags: [] };
      case 'assign_owner':
        return { assignmentType: 'specific', ownerId: '' };
      case 'change_stage':
        return { newStage: '' };
      case 'update_score':
        return { scoreChange: 10 };
      case 'send_notification':
        return { notificationTitle: '', notificationMessage: '', notificationRecipient: 'owner' };
      case 'webhook':
        return { webhookUrl: '', webhookMethod: 'POST', webhookHeaders: {}, webhookBody: {} };
      case 'add_to_sequence':
        return { sequenceId: '' };
      default:
        return {};
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!workflow.name || !workflow.entity) {
      alert('Please fill in all required fields');
      return;
    }

    if (workflow.actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    onSave(workflow);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workflow Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Hot Lead Auto-Assignment"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={workflow.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe what this workflow does..."
            rows="2"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity <span className="text-red-500">*</span>
          </label>
          <select
            value={workflow.entity}
            onChange={(e) => handleChange('entity', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent capitalize"
          >
            {ENTITIES.map(entity => (
              <option key={entity} value={entity} className="capitalize">{entity}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Trigger Configuration */}
      <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
        <div className="flex items-center mb-4">
          <FiZap className="text-blue-600 mr-2" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Trigger</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              When
            </label>
            <select
              value={workflow.trigger.type}
              onChange={(e) => handleTriggerChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {TRIGGER_TYPES.map(trigger => (
                <option key={trigger.value} value={trigger.value}>{trigger.label}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Conditions (optional)
              </label>
              <button
                type="button"
                onClick={addCondition}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
              >
                <FiPlus size={12} className="mr-1" />
                Add Condition
              </button>
            </div>

            {workflow.trigger.conditions.map((condition, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={condition.field}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  placeholder="Field name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="contains">Contains</option>
                </select>
                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FiSettings className="text-gray-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowActionPicker(true)}
            className="btn btn-sm btn-primary flex items-center"
          >
            <FiPlus className="mr-1" size={14} />
            Add Action
          </button>
        </div>

        {workflow.actions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No actions yet. Click "Add Action" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {workflow.actions.map((action, index) => (
              <ActionConfigEditor
                key={index}
                action={action}
                index={index}
                onUpdate={(config) => updateAction(index, config)}
                onRemove={() => removeAction(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Picker Modal */}
      {showActionPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose an Action</h3>
            <div className="grid grid-cols-2 gap-3">
              {ACTION_TYPES.map(actionType => (
                <button
                  key={actionType.value}
                  onClick={() => addAction(actionType.value)}
                  className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                >
                  <span className="text-2xl mr-3">{actionType.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{actionType.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowActionPicker(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
        >
          <FiCheck className="mr-2" />
          Save Workflow
        </button>
      </div>
    </div>
  );
};

// Action Config Editor Component
const ActionConfigEditor = ({ action, index, onUpdate, onRemove }) => {
  const actionLabel = ACTION_TYPES.find(a => a.value === action.type)?.label || action.type;
  const actionIcon = ACTION_TYPES.find(a => a.value === action.type)?.icon || '⚙️';

  const handleConfigChange = (field, value) => {
    onUpdate({ ...action.config, [field]: value });
  };

  const renderConfigFields = () => {
    switch (action.type) {
      case 'send_email':
        return (
          <>
            <input
              type="text"
              value={action.config.subject || ''}
              onChange={(e) => handleConfigChange('subject', e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              value={action.config.body || ''}
              onChange={(e) => handleConfigChange('body', e.target.value)}
              placeholder="Email body (use {{variable}} for placeholders)"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={action.config.recipient || ''}
              onChange={(e) => handleConfigChange('recipient', e.target.value)}
              placeholder="Recipient (e.g., {{email}} or email@example.com)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </>
        );

      case 'send_sms':
        return (
          <>
            <textarea
              value={action.config.message || ''}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="SMS message"
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={action.config.phone || ''}
              onChange={(e) => handleConfigChange('phone', e.target.value)}
              placeholder="Phone number (e.g., {{phone}})"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </>
        );

      case 'create_task':
        return (
          <>
            <input
              type="text"
              value={action.config.taskTitle || ''}
              onChange={(e) => handleConfigChange('taskTitle', e.target.value)}
              placeholder="Task title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              value={action.config.taskDescription || ''}
              onChange={(e) => handleConfigChange('taskDescription', e.target.value)}
              placeholder="Task description"
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={action.config.taskDueDate || '1_day'}
                onChange={(e) => handleConfigChange('taskDueDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="1_day">1 Day</option>
                <option value="3_days">3 Days</option>
                <option value="1_week">1 Week</option>
                <option value="2_weeks">2 Weeks</option>
              </select>
              <select
                value={action.config.taskPriority || 'medium'}
                onChange={(e) => handleConfigChange('taskPriority', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </>
        );

      case 'add_tag':
      case 'remove_tag':
        return (
          <input
            type="text"
            value={action.config.tags?.join(', ') || ''}
            onChange={(e) => handleConfigChange('tags', e.target.value.split(',').map(t => t.trim()))}
            placeholder="Tags (comma separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        );

      case 'send_notification':
        return (
          <>
            <input
              type="text"
              value={action.config.notificationTitle || ''}
              onChange={(e) => handleConfigChange('notificationTitle', e.target.value)}
              placeholder="Notification title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              value={action.config.notificationMessage || ''}
              onChange={(e) => handleConfigChange('notificationMessage', e.target.value)}
              placeholder="Notification message"
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </>
        );

      case 'webhook':
        return (
          <>
            <input
              type="text"
              value={action.config.webhookUrl || ''}
              onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
              placeholder="Webhook URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={action.config.webhookMethod || 'POST'}
              onChange={(e) => handleConfigChange('webhookMethod', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </>
        );

      default:
        return (
          <div className="text-sm text-gray-500 italic">
            No additional configuration required
          </div>
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{actionIcon}</span>
          <span className="flex items-center justify-center w-6 h-6 bg-primary-600 text-white text-xs font-semibold rounded-full">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-900">{actionLabel}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="Remove action"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {renderConfigFields()}
      </div>
    </div>
  );
};

export default WorkflowBuilder;
