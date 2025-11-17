import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiPlay,
  FiPause,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiZap,
  FiCheckCircle,
  FiActivity,
  FiCopy
} from 'react-icons/fi';
import WorkflowBuilder from '../components/WorkflowBuilder';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function Workflows() {
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdWorkflow, setCreatedWorkflow] = useState(null);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  // Fetch workflows
  const { data: workflowsData, isLoading } = useQuery('workflows', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/workflows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Fetch analytics
  const { data: analytics } = useQuery('workflow-analytics', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/workflows/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Activate workflow
  const activateMutation = useMutation(
    async (id) => {
      const token = localStorage.getItem('token');
      return await axios.patch(`${API_URL}/workflows/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    {
      onSuccess: () => {
        toast.success('Workflow activated');
        queryClient.invalidateQueries('workflows');
      }
    }
  );

  // Pause workflow
  const pauseMutation = useMutation(
    async (id) => {
      const token = localStorage.getItem('token');
      return await axios.patch(`${API_URL}/workflows/${id}/pause`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    {
      onSuccess: () => {
        toast.success('Workflow paused');
        queryClient.invalidateQueries('workflows');
      }
    }
  );

  // Delete workflow
  const deleteMutation = useMutation(
    async (id) => {
      const token = localStorage.getItem('token');
      return await axios.delete(`${API_URL}/workflows/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    {
      onSuccess: () => {
        toast.success('Workflow deleted');
        queryClient.invalidateQueries('workflows');
      }
    }
  );

  // Create workflow mutation
  const createWorkflowMutation = useMutation(
    async (workflowData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/workflows`,
        workflowData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        setCreatedWorkflow(data);
        toast.success('Workflow created successfully!');
        setShowBuilder(false);
        setShowSuccessModal(true);
        queryClient.invalidateQueries('workflows');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create workflow');
      }
    }
  );

  // Create from template
  const createFromTemplateMutation = useMutation(
    async (template) => {
      setCreatingFromTemplate(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/workflows/templates/${template}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        setCreatedWorkflow(data);
        setErrorDetails(null); // Clear any previous errors
        toast.success('Workflow created successfully!');
        setShowTemplates(false);
        setShowSuccessModal(true);
        queryClient.invalidateQueries('workflows');
        setCreatingFromTemplate(false);
      },
      onError: (error) => {
        const errorData = error.response?.data;
        let errorMessage = errorData?.error || 'Failed to create workflow';

        // Store full error details for display
        setErrorDetails({
          message: errorMessage,
          details: errorData?.details || [],
          timestamp: new Date().toLocaleTimeString()
        });

        // Add validation details if available
        if (errorData?.details && errorData.details.length > 0) {
          const validationMessages = errorData.details.map(d => d.message).join(', ');
          errorMessage += ': ' + validationMessages;
        }

        toast.error(errorMessage, { duration: 6000 });
        console.error('Workflow creation error:', errorData);
        setCreatingFromTemplate(false);
      }
    }
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const templates = [
    {
      id: 'lead-scoring-alert',
      name: 'High Score Lead Alert',
      description: 'Get notified when a lead reaches hot status (80+ score)',
      icon: '🔥',
      category: 'Alerts',
      trigger: 'Score Threshold (80+)',
      actions: ['Send Notification', 'Create Task'],
      entity: 'Lead',
      popularity: 'Most Popular'
    },
    {
      id: 'inactive-lead-followup',
      name: 'Inactive Lead Follow-up',
      description: 'Automatically re-engage leads inactive for 7+ days',
      icon: '💤',
      category: 'Engagement',
      trigger: 'Inactivity (7 days)',
      actions: ['Create Task'],
      entity: 'Lead',
      popularity: 'Popular'
    },
    {
      id: 'deal-won-celebration',
      name: 'Deal Won Celebration',
      description: 'Celebrate wins and kickoff onboarding automatically',
      icon: '🎉',
      category: 'Sales',
      trigger: 'Stage Changed (Closed Won)',
      actions: ['Send Notification', 'Create Task', 'Add Tags'],
      entity: 'Deal',
      popularity: 'Popular'
    },
    {
      id: 'auto-assign-leads',
      name: 'Auto-assign New Leads',
      description: 'Distribute new leads to reps using round-robin',
      icon: '👥',
      category: 'Distribution',
      trigger: 'Record Created',
      actions: ['Assign Owner', 'Create Task'],
      entity: 'Lead',
      popularity: 'Trending'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1>
          <p className="text-gray-600 mt-1">
            Automate repetitive tasks and never miss an opportunity
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="btn btn-secondary flex items-center"
          >
            <FiCopy className="mr-2" />
            Use Template
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center"
          >
            <FiPlus className="mr-2" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Error Display */}
      {errorDetails && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Workflow Creation Failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="font-semibold">{errorDetails.message}</p>
                {errorDetails.details && errorDetails.details.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold mb-1">Validation Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {errorDetails.details.map((detail, index) => (
                        <li key={index}>
                          <span className="font-medium">{detail.field}:</span> {detail.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-2 text-xs text-red-600">
                  Time: {errorDetails.timestamp}
                </p>
              </div>
            </div>
            <div className="ml-3">
              <button
                onClick={() => setErrorDetails(null)}
                className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workflows</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics.totalWorkflows}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiZap className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {analytics.activeWorkflows}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiPlay className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics.totalExecutions?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiActivity className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics.successRate?.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FiCheckCircle className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Workflows</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : workflowsData?.workflows?.length === 0 ? (
          <div className="text-center py-12">
            <FiZap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first workflow or using a template.
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="btn btn-secondary inline-flex items-center"
              >
                <FiCopy className="mr-2" />
                Browse Templates
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary inline-flex items-center"
              >
                <FiPlus className="mr-2" />
                Create Workflow
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {workflowsData?.workflows?.map((workflow) => (
              <div key={workflow._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-medium text-gray-900">{workflow.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full capitalize">
                        {workflow.entity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <FiZap className="mr-1" size={12} />
                        {workflow.trigger.type.replace('_', ' ')}
                      </span>
                      <span>{workflow.actions.length} actions</span>
                      {workflow.stats?.totalExecutions > 0 && (
                        <>
                          <span>{workflow.stats.totalExecutions} executions</span>
                          <span>
                            {((workflow.stats.successfulExecutions / workflow.stats.totalExecutions) * 100).toFixed(0)}% success
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {workflow.status === 'active' ? (
                      <button
                        onClick={() => pauseMutation.mutate(workflow._id)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                        title="Pause"
                      >
                        <FiPause size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => activateMutation.mutate(workflow._id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Activate"
                      >
                        <FiPlay size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedWorkflow(workflow)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this workflow?')) {
                          deleteMutation.mutate(workflow._id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Workflow Templates</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Get started quickly with pre-built automation workflows
                </p>
              </div>
              <button
                onClick={() => !creatingFromTemplate && setShowTemplates(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={creatingFromTemplate}
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    creatingFromTemplate
                      ? 'cursor-not-allowed opacity-60'
                      : 'border-gray-200 hover:border-primary-500 hover:shadow-lg cursor-pointer transform hover:-translate-y-1'
                  }`}
                  onClick={() => !creatingFromTemplate && createFromTemplateMutation.mutate(template.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-5xl flex-shrink-0">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                        {template.popularity && (
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                            template.popularity === 'Most Popular' ? 'bg-orange-100 text-orange-700' :
                            template.popularity === 'Trending' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {template.popularity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center text-xs">
                          <span className="font-semibold text-gray-700 w-16">Entity:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {template.entity}
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="font-semibold text-gray-700 w-16">Trigger:</span>
                          <span className="text-gray-600">⚡ {template.trigger}</span>
                        </div>
                        <div className="flex items-start text-xs">
                          <span className="font-semibold text-gray-700 w-16 pt-0.5">Actions:</span>
                          <div className="flex flex-wrap gap-1">
                            {template.actions.map((action, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {action}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          📁 {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {creatingFromTemplate && (
              <div className="p-6 border-t border-gray-200 bg-blue-50">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  <p className="text-sm font-medium text-gray-700">Creating workflow from template...</p>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowTemplates(false)}
                disabled={creatingFromTemplate}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Create Custom Workflow</h2>
              <p className="text-sm text-gray-600 mt-1">
                Build a custom automation workflow from scratch
              </p>
            </div>

            <div className="p-6">
              <WorkflowBuilder
                onSave={(workflowData) => createWorkflowMutation.mutate(workflowData)}
                onCancel={() => setShowBuilder(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Modal (old create modal) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Choose How to Create</h2>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowBuilder(true);
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="flex items-start">
                  <div className="text-4xl mr-4">⚙️</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                      Build Custom Workflow
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Create a fully customized workflow with your own triggers and actions
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowTemplates(true);
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="flex items-start">
                  <div className="text-4xl mr-4">📋</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                      Use a Template
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Get started quickly with a pre-built workflow template
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-8 text-center">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <FiCheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Workflow Created Successfully!</h2>
              <p className="text-gray-600 mb-6">
                Your workflow has been created and is ready to automate your processes.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <FiZap className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {createdWorkflow.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{createdWorkflow.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(createdWorkflow.status)}`}>
                        {createdWorkflow.status}
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full capitalize">
                        {createdWorkflow.entity}
                      </span>
                      <span className="px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                        {createdWorkflow.actions.length} Actions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <FiActivity className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Next Steps</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Workflow is currently in <strong>{createdWorkflow.status}</strong> status</li>
                      <li>• {createdWorkflow.status === 'draft' ? 'Activate the workflow to start automation' : 'The workflow will start executing automatically'}</li>
                      <li>• Monitor executions and performance in the workflow list</li>
                      <li>• You can customize settings anytime</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSelectedWorkflow(createdWorkflow);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  View Details
                </button>
                {createdWorkflow.status === 'draft' && (
                  <button
                    onClick={() => {
                      activateMutation.mutate(createdWorkflow._id);
                      setShowSuccessModal(false);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center"
                  >
                    <FiPlay className="mr-2" />
                    Activate Now
                  </button>
                )}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedWorkflow.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedWorkflow.description}</p>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Trigger */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Trigger</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 capitalize">
                    {selectedWorkflow.trigger.type.replace('_', ' ')}
                  </p>
                  {selectedWorkflow.trigger.conditions?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedWorkflow.trigger.conditions.map((cond, idx) => (
                        <p key={idx} className="text-xs text-blue-700">
                          {cond.field} {cond.operator} {cond.value}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions ({selectedWorkflow.actions.length})</h3>
                <div className="space-y-3">
                  {selectedWorkflow.actions.map((action, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-600 text-white text-xs font-semibold rounded-full">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {action.type.replace('_', ' ')}
                        </p>
                      </div>
                      {Object.keys(action.config || {}).length > 0 && (
                        <div className="mt-2 pl-8">
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(action.config, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              {selectedWorkflow.stats && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Executions</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {selectedWorkflow.stats.totalExecutions}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Successful</p>
                      <p className="text-lg font-semibold text-green-600 mt-1">
                        {selectedWorkflow.stats.successfulExecutions}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Failed</p>
                      <p className="text-lg font-semibold text-red-600 mt-1">
                        {selectedWorkflow.stats.failedExecutions}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workflows;
