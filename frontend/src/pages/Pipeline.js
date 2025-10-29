import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { dealsAPI, contactsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiDollarSign, FiTrendingUp, FiActivity, FiEdit2, FiEye, FiX } from 'react-icons/fi';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: 'bg-gray-500' },
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-yellow-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' }
];

function Pipeline() {
  const queryClient = useQueryClient();
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newDealForm, setNewDealForm] = useState({
    name: '',
    value: '',
    contact: '',
    closeDate: '',
    stage: 'prospecting',
    probability: 10,
    source: 'other',
    description: ''
  });

  const heroImages = [
    '/assets/images/pipeline-hero-1.jpg',
    '/assets/images/background-hero.jpg'
  ];

  // Rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Fetch deals grouped by stage
  const { data: dealsData, isLoading } = useQuery(
    'deals-pipeline',
    () => dealsAPI.getAll({ groupBy: 'stage' }),
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Fetch analytics
  const { data: analytics } = useQuery('deals-analytics', dealsAPI.getAnalytics);

  // Fetch contacts for the form
  const { data: contactsData } = useQuery('contacts', () => contactsAPI.getAll({ limit: 500 }));

  // Create deal mutation
  const createDealMutation = useMutation(
    (dealData) => dealsAPI.create(dealData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals-pipeline');
        queryClient.invalidateQueries('deals-analytics');
        toast.success('Deal created successfully!');
        setIsNewDealModalOpen(false);
        setNewDealForm({
          name: '',
          value: '',
          contact: '',
          closeDate: '',
          stage: 'prospecting',
          probability: 10,
          source: 'other',
          description: ''
        });
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to create deal');
      }
    }
  );

  // Move deal to different stage
  const moveDealMutation = useMutation(
    ({ dealId, newStage }) => dealsAPI.moveStage(dealId, newStage),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals-pipeline');
        queryClient.invalidateQueries('deals-analytics');
        toast.success('Deal moved successfully');
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to move deal');
      }
    }
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleDragStart = (e, deal) => {
    e.dataTransfer.setData('dealId', deal._id);
    e.dataTransfer.setData('currentStage', deal.stage);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    const currentStage = e.dataTransfer.getData('currentStage');

    if (currentStage !== newStage) {
      moveDealMutation.mutate({ dealId, newStage });
    }
  };

  const handleNewDealChange = (e) => {
    const { name, value } = e.target;
    setNewDealForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewDealSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!newDealForm.name || !newDealForm.value || !newDealForm.contact || !newDealForm.closeDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    createDealMutation.mutate({
      ...newDealForm,
      value: parseFloat(newDealForm.value),
      probability: parseInt(newDealForm.probability)
    });
  };

  const grouped = dealsData?.grouped || {};
  const contacts = contactsData?.contacts || [];

  return (
    <div className="space-y-6">
      {/* Hero Header with Video Background */}
      <div className="relative h-72 overflow-hidden rounded-lg">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/assets/videos/pipeline-hero.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/85 via-purple-900/75 to-transparent"></div>

        {/* Content */}
        <div className="relative h-full flex items-center px-8">
          <div className="flex items-center space-x-6 w-full">
            {/* Rotating Hero Image */}
            <div className="hidden md:block w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl">
              {heroImages.map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={`Pipeline ${index + 1}`}
                  className={`w-full h-full object-cover absolute transition-opacity duration-1000 ${
                    index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ transitionDelay: index === currentImageIndex ? '0ms' : '0ms' }}
                />
              ))}
            </div>

            {/* Header Text and Button */}
            <div className="flex-1 flex items-center justify-between">
              <div className="text-white">
                <h1 className="text-4xl font-bold drop-shadow-lg">Deal Pipeline</h1>
                <p className="text-xl mt-2 text-blue-100 drop-shadow-md">
                  Manage your sales pipeline with drag-and-drop functionality
                </p>
                <div className="mt-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Real-time Pipeline</span>
                  </div>
                  <div className="text-sm font-medium">
                    {analytics?.totalValue ? formatCurrency(analytics.totalValue) : '$0'} Total Value
                  </div>
                </div>
              </div>

              {/* New Deal Button */}
              <button
                onClick={() => setIsNewDealModalOpen(true)}
                className="bg-white text-primary-600 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center shadow-lg"
              >
                <FiPlus className="mr-2" size={20} />
                New Deal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">

      {/* Pipeline Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(analytics.totalValue)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiDollarSign className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weighted Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(analytics.totalWeightedValue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiTrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics.winRate.toFixed(1)}%
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
                <p className="text-sm text-gray-600">Avg Deal Size</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(analytics.averageDealSize)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FiDollarSign className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const deals = grouped[stage.key] || [];
            const stageValue = deals.reduce((sum, deal) => sum + deal.value, 0);
            const stageCount = deals.length;

            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                {/* Stage Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-3">
                  <div className={`${stage.color} text-white px-4 py-3 rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{stage.label}</h3>
                      <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm">
                        {stageCount}
                      </span>
                    </div>
                    <p className="text-sm mt-1 opacity-90">{formatCurrency(stageValue)}</p>
                  </div>
                </div>

                {/* Deal Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {deals.map((deal) => (
                    <div
                      key={deal._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-move hover:shadow-md transition-shadow"
                    >
                      {/* Deal Name */}
                      <h4 className="font-medium text-gray-900 mb-2">{deal.name}</h4>

                      {/* Deal Value */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-primary-600">
                          {formatCurrency(deal.value)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {deal.probability}%
                        </span>
                      </div>

                      {/* Company & Contact */}
                      {deal.company && (
                        <p className="text-sm text-gray-600 mb-1">{deal.company}</p>
                      )}
                      {deal.contact && (
                        <p className="text-sm text-gray-500">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </p>
                      )}

                      {/* AI Score */}
                      {deal.aiInsights?.predictedProbability && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">AI Score</span>
                            <span className={`text-xs font-semibold ${
                              deal.aiInsights.predictedProbability >= 70
                                ? 'text-green-600'
                                : deal.aiInsights.predictedProbability >= 40
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {deal.aiInsights.predictedProbability.toFixed(0)}%
                            </span>
                          </div>
                          <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                deal.aiInsights.predictedProbability >= 70
                                  ? 'bg-green-500'
                                  : deal.aiInsights.predictedProbability >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${deal.aiInsights.predictedProbability}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Expected Close Date */}
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Close: {new Date(deal.closeDate).toLocaleDateString()}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('View deal details (coming soon)');
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="View"
                          >
                            <FiEye size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('Edit deal (coming soon)');
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {stageCount === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No deals in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Deal Modal */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Deal</h2>
              <button
                onClick={() => setIsNewDealModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleNewDealSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deal Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newDealForm.name}
                    onChange={handleNewDealChange}
                    placeholder="e.g., Acme Corp - Enterprise License"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Deal Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deal Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={newDealForm.value}
                    onChange={handleNewDealChange}
                    placeholder="50000"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Expected Close Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Close Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="closeDate"
                    value={newDealForm.closeDate}
                    onChange={handleNewDealChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="contact"
                    value={newDealForm.contact}
                    onChange={handleNewDealChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a contact</option>
                    {contacts.map((contact) => (
                      <option key={contact._id} value={contact._id}>
                        {contact.firstName} {contact.lastName} - {contact.company}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    name="stage"
                    value={newDealForm.stage}
                    onChange={handleNewDealChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {STAGES.filter(s => s.key !== 'closed_won' && s.key !== 'closed_lost').map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Probability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    name="probability"
                    value={newDealForm.probability}
                    onChange={handleNewDealChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    name="source"
                    value={newDealForm.source}
                    onChange={handleNewDealChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newDealForm.description}
                    onChange={handleNewDealChange}
                    placeholder="Additional details about this deal..."
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  ></textarea>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDealMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {createDealMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiPlus className="mr-2" />
                      Create Deal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Pipeline;
