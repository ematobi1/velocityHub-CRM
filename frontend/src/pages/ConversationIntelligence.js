import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiMic,
  FiMail,
  FiMessageSquare,
  FiVideo,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiTarget,
  FiActivity,
  FiAward,
  FiBarChart2
} from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function ConversationIntelligence() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analysisForm, setAnalysisForm] = useState({
    conversationType: 'call',
    transcript: '',
    leadId: '',
    contactId: '',
    dealId: ''
  });

  // Fetch conversations
  const { data: conversations, isLoading, refetch } = useQuery(
    'conversations',
    async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/conversation-intelligence/search`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  );

  // Fetch coaching insights
  const { data: coachingInsights } = useQuery('coaching-insights', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/conversation-intelligence/user/coaching-insights`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Analyze conversation mutation
  const analyzeMutation = useMutation(
    async (data) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/conversation-intelligence/analyze`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Conversation analyzed successfully!');
        setShowAnalyzeModal(false);
        setAnalysisForm({
          conversationType: 'call',
          transcript: '',
          leadId: '',
          contactId: '',
          dealId: ''
        });
        refetch();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Analysis failed');
      }
    }
  );

  const handleAnalyze = (e) => {
    e.preventDefault();
    analyzeMutation.mutate(analysisForm);
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'very_positive':
        return <FiTrendingUp className="text-green-600" />;
      case 'positive':
        return <FiTrendingUp className="text-green-500" />;
      case 'neutral':
        return <FiMinus className="text-gray-500" />;
      case 'negative':
        return <FiTrendingDown className="text-orange-500" />;
      case 'very_negative':
        return <FiTrendingDown className="text-red-600" />;
      default:
        return <FiMinus className="text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'very_positive': return 'bg-green-100 text-green-800';
      case 'positive': return 'bg-green-50 text-green-700';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      case 'negative': return 'bg-orange-100 text-orange-800';
      case 'very_negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getConversationIcon = (type) => {
    switch (type) {
      case 'call': return <FiMic className="text-blue-600" />;
      case 'email': return <FiMail className="text-purple-600" />;
      case 'message': return <FiMessageSquare className="text-green-600" />;
      case 'meeting': return <FiVideo className="text-orange-600" />;
      default: return <FiMic className="text-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversation Intelligence</h1>
          <p className="text-gray-600 mt-1">
            AI-powered insights from your sales conversations
          </p>
        </div>
        <button
          onClick={() => setShowAnalyzeModal(true)}
          className="btn btn-primary flex items-center"
        >
          <FiActivity className="mr-2" />
          Analyze Conversation
        </button>
      </div>

      {/* Coaching Insights Summary */}
      {coachingInsights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversations</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {coachingInsights.conversationCount}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiBarChart2 className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Sentiment</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(coachingInsights.averages?.sentiment * 100 || 0).toFixed(0)}%
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
                <p className="text-sm text-gray-600">Quality Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {coachingInsights.averages?.qualityScore?.toFixed(0) || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiAward className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Talk Ratio</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {coachingInsights.averages?.talkRatio?.toFixed(0) || 50}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FiUser className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Conversations</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : conversations?.length === 0 ? (
          <div className="text-center py-12">
            <FiActivity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations analyzed yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by analyzing your first conversation.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAnalyzeModal(true)}
                className="btn btn-primary inline-flex items-center"
              >
                <FiActivity className="mr-2" />
                Analyze Conversation
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations?.map((conv) => (
              <div
                key={conv._id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getConversationIcon(conv.conversationType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 capitalize">
                          {conv.conversationType}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSentimentColor(conv.sentiment?.overall)}`}>
                          {conv.sentiment?.overall?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {conv.summary?.brief || 'No summary available'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <FiClock className="mr-1" size={12} />
                          {new Date(conv.conversationDate).toLocaleDateString()}
                        </span>
                        <span>Quality: {conv.qualityScore}/100</span>
                        {conv.insights?.length > 0 && (
                          <span>{conv.insights.length} insights</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSentimentIcon(conv.sentiment?.overall)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analyze Modal */}
      {showAnalyzeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Analyze Conversation</h2>
            </div>

            <form onSubmit={handleAnalyze} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversation Type
                </label>
                <select
                  value={analysisForm.conversationType}
                  onChange={(e) => setAnalysisForm({ ...analysisForm, conversationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="message">Message</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transcript
                </label>
                <textarea
                  value={analysisForm.transcript}
                  onChange={(e) => setAnalysisForm({ ...analysisForm, transcript: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={10}
                  placeholder="Paste the conversation transcript here..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste the full conversation transcript for AI analysis
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAnalyzeModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={analyzeMutation.isLoading}
                  className="btn btn-primary"
                >
                  {analyzeMutation.isLoading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {selectedConversation.conversationType} Analysis
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedConversation.conversationDate).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sentiment & Quality */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sentiment</span>
                    {getSentimentIcon(selectedConversation.sentiment?.overall)}
                  </div>
                  <p className={`text-lg font-semibold mt-2 capitalize ${getSentimentColor(selectedConversation.sentiment?.overall).split(' ')[1]}`}>
                    {selectedConversation.sentiment?.overall?.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Score: {(selectedConversation.sentiment?.score * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quality Score</span>
                    <FiAward className="text-purple-600" />
                  </div>
                  <p className="text-lg font-semibold text-purple-600 mt-2">
                    {selectedConversation.qualityScore}/100
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedConversation.qualityScore >= 80 ? 'Excellent' :
                     selectedConversation.qualityScore >= 60 ? 'Good' :
                     selectedConversation.qualityScore >= 40 ? 'Fair' : 'Needs Improvement'}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
                <p className="text-sm text-gray-700">{selectedConversation.summary?.brief}</p>
              </div>

              {/* Key Insights */}
              {selectedConversation.insights?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Insights</h3>
                  <div className="space-y-2">
                    {selectedConversation.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <FiTarget className="text-blue-600 mt-1 flex-shrink-0" size={16} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-900 capitalize">
                            {insight.type?.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{insight.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {selectedConversation.actionItems?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Action Items</h3>
                  <div className="space-y-2">
                    {selectedConversation.actionItems.map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <FiCheckCircle className="text-green-600 mt-1 flex-shrink-0" size={16} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{item.description}</p>
                          <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                            item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {selectedConversation.risks?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Risks Identified</h3>
                  <div className="space-y-2">
                    {selectedConversation.risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                        <FiAlertCircle className="text-red-600 mt-1 flex-shrink-0" size={16} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-900 capitalize">
                            {risk.type?.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{risk.description}</p>
                          {risk.mitigation && (
                            <p className="text-xs text-gray-600 mt-2">
                              <strong>Mitigation:</strong> {risk.mitigation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coaching Tips */}
              {selectedConversation.coachingTips?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Coaching Tips</h3>
                  <div className="space-y-2">
                    {selectedConversation.coachingTips.map((tip, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs font-medium text-purple-900 capitalize">
                          {tip.category?.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{tip.recommendation}</p>
                        {tip.example && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            Example: {tip.example}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedConversation(null)}
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

export default ConversationIntelligence;
