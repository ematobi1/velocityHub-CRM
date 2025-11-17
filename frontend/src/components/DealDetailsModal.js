import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { dealsAPI, contactsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { FiX, FiDollarSign, FiCalendar, FiUser, FiTrendingUp, FiEdit2, FiSave, FiActivity } from 'react-icons/fi';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' }
];

const DealDetailsModal = ({ deal, onClose, mode = 'view' }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [formData, setFormData] = useState({
    name: deal?.name || '',
    value: deal?.value || 0,
    stage: deal?.stage || 'prospecting',
    probability: deal?.probability || 10,
    closeDate: deal?.closeDate ? new Date(deal.closeDate).toISOString().split('T')[0] : '',
    contact: deal?.contact?._id || '',
    source: deal?.source || 'other',
    description: deal?.description || ''
  });

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery('contacts', () => contactsAPI.getAll({ limit: 500 }));
  const contacts = contactsData?.contacts || [];

  // Fetch AI insights
  const { data: aiInsights, isLoading: aiLoading } = useQuery(
    ['deal-ai-insights', deal?._id],
    () => deal ? dealsAPI.getAIInsights(deal._id) : null,
    { enabled: !!deal?._id }
  );

  // Update mutation
  const updateMutation = useMutation(
    (updates) => dealsAPI.update(deal._id, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals-pipeline');
        queryClient.invalidateQueries('deals-analytics');
        toast.success('Deal updated successfully!');
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to update deal');
      }
    }
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      value: parseFloat(formData.value),
      probability: parseInt(formData.probability)
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDaysUntilClose = (closeDate) => {
    const today = new Date();
    const close = new Date(closeDate);
    const diff = Math.ceil((close - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const insights = aiInsights || deal?.aiInsights;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="text-2xl font-bold bg-white/20 border border-white/30 rounded px-3 py-1 w-full text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Deal name"
              />
            ) : (
              <h2 className="text-2xl font-bold">{deal.name}</h2>
            )}
            <div className="mt-2 flex items-center space-x-4">
              <span className="text-sm opacity-90">
                {STAGES.find(s => s.key === (isEditing ? formData.stage : deal.stage))?.label}
              </span>
              <span className="text-sm opacity-90">•</span>
              <span className="text-sm opacity-90">
                Created {new Date(deal.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    setFormData({
                      name: deal.name,
                      value: deal.value,
                      stage: deal.stage,
                      probability: deal.probability,
                      closeDate: new Date(deal.closeDate).toISOString().split('T')[0],
                      contact: deal.contact?._id || '',
                      source: deal.source,
                      description: deal.description || ''
                    });
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isLoading}
                  className="px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center disabled:opacity-50"
                >
                  <FiSave className="mr-2" />
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center"
              >
                <FiEdit2 className="mr-2" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-700 font-medium">Deal Value</span>
                <FiDollarSign className="text-green-600" />
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => handleChange('value', e.target.value)}
                  className="text-2xl font-bold text-green-900 bg-white border border-green-300 rounded px-2 py-1 w-full"
                />
              ) : (
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(deal.value)}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700 font-medium">Probability</span>
                <FiTrendingUp className="text-blue-600" />
              </div>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.probability}
                  onChange={(e) => handleChange('probability', e.target.value)}
                  min="0"
                  max="100"
                  className="text-2xl font-bold text-blue-900 bg-white border border-blue-300 rounded px-2 py-1 w-full"
                />
              ) : (
                <div className="text-2xl font-bold text-blue-900">{deal.probability}%</div>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-700 font-medium">Expected Revenue</span>
                <FiActivity className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency((isEditing ? formData.value : deal.value) * (isEditing ? formData.probability : deal.probability) / 100)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-orange-700 font-medium">Days to Close</span>
                <FiCalendar className="text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {getDaysUntilClose(isEditing ? formData.closeDate : deal.closeDate)}
              </div>
            </div>
          </div>

          {/* Deal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Deal Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pipeline Stage
                </label>
                {isEditing ? (
                  <select
                    value={formData.stage}
                    onChange={(e) => handleChange('stage', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {STAGES.map(stage => (
                      <option key={stage.key} value={stage.key}>{stage.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {STAGES.find(s => s.key === deal.stage)?.label}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Close Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.closeDate}
                    onChange={(e) => handleChange('closeDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {new Date(deal.closeDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                {isEditing ? (
                  <select
                    value={formData.contact}
                    onChange={(e) => handleChange('contact', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a contact</option>
                    {contacts.map(contact => (
                      <option key={contact._id} value={contact._id}>
                        {contact.firstName} {contact.lastName} - {contact.company}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : 'No contact assigned'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                {isEditing ? (
                  <select
                    value={formData.source}
                    onChange={(e) => handleChange('source', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="email">Email</option>
                    <option value="social_media">Social Media</option>
                    <option value="event">Event</option>
                    <option value="partner">Partner</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 capitalize">
                    {deal.source?.replace('_', ' ')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional details..."
                  />
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 min-h-[100px]">
                    {deal.description || 'No description provided'}
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>

              {aiLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : insights ? (
                <div className="space-y-4">
                  {/* Predicted Probability */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-indigo-700 font-medium">AI Predicted Win Rate</span>
                      <span className="text-xs text-indigo-600">Confidence: {insights.confidence?.toFixed(0)}%</span>
                    </div>
                    <div className="text-3xl font-bold text-indigo-900 mb-2">
                      {insights.predictedProbability?.toFixed(0)}%
                    </div>
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${insights.predictedProbability}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Forecasted Revenue */}
                  {insights.forecastedRevenue && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Forecast</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Pessimistic</span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(insights.forecastedRevenue.low)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Expected</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(insights.forecastedRevenue.expected)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Optimistic</span>
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(insights.forecastedRevenue.high)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expected Days to Close */}
                  {insights.expectedDaysToClose && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Expected Timeline</h4>
                      <div className="text-2xl font-bold text-yellow-900">
                        {Math.ceil(insights.expectedDaysToClose)} days
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Predicted time to close based on historical data
                      </p>
                    </div>
                  )}

                  {/* Risk Factors */}
                  {insights.riskFactors && insights.riskFactors.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-2">Risk Factors</h4>
                      <div className="space-y-2">
                        {insights.riskFactors.map((risk, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <span className={`inline-block w-2 h-2 rounded-full mt-1 ${
                              risk.severity === 'high' ? 'bg-red-600' :
                              risk.severity === 'medium' ? 'bg-yellow-600' :
                              'bg-gray-600'
                            }`}></span>
                            <div>
                              <div className="text-xs font-medium text-red-900">{risk.factor}</div>
                              <div className="text-xs text-red-700">{risk.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {insights.recommendations && insights.recommendations.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-800 mb-2">AI Recommendations</h4>
                      <ul className="space-y-1">
                        {insights.recommendations.map((rec, index) => (
                          <li key={index} className="text-xs text-green-700 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FiActivity size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">AI insights not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetailsModal;
