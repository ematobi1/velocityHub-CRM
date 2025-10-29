import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiSearch,
  FiLinkedin,
  FiTwitter,
  FiUser,
  FiMapPin,
  FiBriefcase,
  FiTrendingUp,
  FiUserPlus,
  FiExternalLink,
  FiDownload,
  FiRefreshCw,
  FiActivity
} from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function SocialMedia() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profiles');
  const [searchPlatform, setSearchPlatform] = useState('linkedin');
  const [searchQuery, setSearchQuery] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch profiles
  const { data: profilesData, isLoading } = useQuery('social-profiles', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/social-media/profiles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Fetch analytics
  const { data: analytics } = useQuery('social-analytics', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/social-media/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Import profile mutation
  const importMutation = useMutation(
    async ({ platform, url, createLead }) => {
      const token = localStorage.getItem('token');
      const endpoint = platform === 'linkedin'
        ? `${API_URL}/social-media/linkedin/import`
        : `${API_URL}/social-media/twitter/import`;

      const body = platform === 'linkedin'
        ? { profileUrl: url, createLead }
        : { username: url.replace('@', ''), createLead };

      const response = await axios.post(endpoint, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Profile imported successfully!');
        setImportUrl('');
        queryClient.invalidateQueries('social-profiles');
        queryClient.invalidateQueries('social-analytics');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Import failed');
      }
    }
  );

  // Sync profile mutation
  const syncMutation = useMutation(
    async (profileId) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/social-media/profiles/${profileId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Profile synced!');
        queryClient.invalidateQueries('social-profiles');
      }
    }
  );

  // Create lead mutation
  const createLeadMutation = useMutation(
    async (profileId) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/social-media/profiles/${profileId}/create-lead`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Lead created from profile!');
        queryClient.invalidateQueries('social-profiles');
      }
    }
  );

  const handleImport = (e) => {
    e.preventDefault();
    importMutation.mutate({
      platform: searchPlatform,
      url: importUrl,
      createLead: true
    });
  };

  const getEngagementColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getEngagementBadge = (score) => {
    if (score >= 80) return { text: 'Very High', color: 'bg-green-100 text-green-800' };
    if (score >= 60) return { text: 'High', color: 'bg-blue-100 text-blue-800' };
    if (score >= 40) return { text: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Low', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media Integration</h1>
          <p className="text-gray-600 mt-1">
            Find and engage with prospects on LinkedIn and Twitter
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profiles</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics.totalProfiles}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiUser className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">LinkedIn</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {analytics.byPlatform?.linkedin || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiLinkedin className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Twitter</p>
                <p className="text-2xl font-bold text-cyan-600 mt-1">
                  {analytics.byPlatform?.twitter || 0}
                </p>
              </div>
              <div className="p-3 bg-cyan-100 rounded-lg">
                <FiTwitter className="text-cyan-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Engagement</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics.averageEngagement?.toFixed(0) || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiTrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Profile</h2>
        <form onSubmit={handleImport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform
              </label>
              <select
                value={searchPlatform}
                onChange={(e) => setSearchPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {searchPlatform === 'linkedin' ? 'LinkedIn Profile URL' : 'Twitter Username'}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder={searchPlatform === 'linkedin' ? 'https://linkedin.com/in/username' : '@username'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <button
                  type="submit"
                  disabled={importMutation.isLoading}
                  className="btn btn-primary flex items-center"
                >
                  {importMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <FiDownload className="mr-2" />
                      Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Profiles List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Imported Profiles</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : profilesData?.profiles?.length === 0 ? (
          <div className="text-center py-12">
            <FiUser className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No profiles yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by importing profiles from LinkedIn or Twitter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {profilesData?.profiles?.map((profile) => {
              const engagementScore = profile.engagement?.engagementRate || 0;
              const badge = getEngagementBadge(engagementScore);

              return (
                <div
                  key={profile._id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {profile.profilePicture ? (
                        <img
                          src={profile.profilePicture}
                          alt={profile.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <FiUser className="text-gray-400" size={24} />
                        </div>
                      )}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {profile.displayName}
                        </h3>
                        {profile.platform === 'linkedin' ? (
                          <FiLinkedin className="text-blue-600 flex-shrink-0" size={16} />
                        ) : (
                          <FiTwitter className="text-cyan-600 flex-shrink-0" size={16} />
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>

                      {profile.headline && (
                        <p className="text-sm text-gray-600 mt-1 truncate">{profile.headline}</p>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {profile.location && (
                          <span className="flex items-center">
                            <FiMapPin className="mr-1" size={12} />
                            {profile.location}
                          </span>
                        )}
                        {profile.linkedin?.company && (
                          <span className="flex items-center">
                            <FiBriefcase className="mr-1" size={12} />
                            {profile.linkedin.company}
                          </span>
                        )}
                        {profile.engagement?.lastActive && (
                          <span>
                            Active {new Date(profile.engagement.lastActive).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Signals */}
                      {profile.signals?.length > 0 && (
                        <div className="flex items-center space-x-2 mt-2">
                          {profile.signals.slice(0, 2).map((signal, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                            >
                              {signal.type.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          syncMutation.mutate(profile._id);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Sync"
                      >
                        <FiRefreshCw size={16} />
                      </button>
                      {!profile.lead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            createLeadMutation.mutate(profile._id);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Create Lead"
                        >
                          <FiUserPlus size={16} />
                        </button>
                      )}
                      <a
                        href={profile.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View Profile"
                      >
                        <FiExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedProfile.profilePicture ? (
                  <img
                    src={selectedProfile.profilePicture}
                    alt={selectedProfile.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <FiUser className="text-gray-400" size={32} />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedProfile.displayName}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedProfile.headline}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Engagement Score */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Engagement Score</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {(selectedProfile.engagement?.engagementRate || 0).toFixed(0)}
                    </p>
                  </div>
                  <FiActivity className="text-purple-600" size={48} />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Professional</h3>
                  <div className="space-y-2 text-sm">
                    {selectedProfile.linkedin?.position && (
                      <p><strong>Position:</strong> {selectedProfile.linkedin.position}</p>
                    )}
                    {selectedProfile.linkedin?.company && (
                      <p><strong>Company:</strong> {selectedProfile.linkedin.company}</p>
                    )}
                    {selectedProfile.linkedin?.industry && (
                      <p><strong>Industry:</strong> {selectedProfile.linkedin.industry}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Social</h3>
                  <div className="space-y-2 text-sm">
                    {selectedProfile.twitter?.followerCount && (
                      <p><strong>Followers:</strong> {selectedProfile.twitter.followerCount.toLocaleString()}</p>
                    )}
                    {selectedProfile.linkedin?.mutualConnections && (
                      <p><strong>Mutual Connections:</strong> {selectedProfile.linkedin.mutualConnections}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {selectedProfile.recentActivity?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {selectedProfile.recentActivity.slice(0, 3).map((activity, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900">{activity.content}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(activity.date).toLocaleDateString()}</span>
                          <span>❤️ {activity.likes}</span>
                          <span>💬 {activity.comments}</span>
                          <span>🔄 {activity.shares}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buying Signals */}
              {selectedProfile.signals?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Buying Signals</h3>
                  <div className="space-y-2">
                    {selectedProfile.signals.map((signal, idx) => (
                      <div key={idx} className="bg-orange-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-orange-900 capitalize">
                          {signal.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">{signal.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <a
                href={selectedProfile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary flex items-center"
              >
                <FiExternalLink className="mr-2" />
                View on {selectedProfile.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'}
              </a>
              {!selectedProfile.lead && (
                <button
                  onClick={() => {
                    createLeadMutation.mutate(selectedProfile._id);
                    setSelectedProfile(null);
                  }}
                  className="btn btn-primary flex items-center"
                >
                  <FiUserPlus className="mr-2" />
                  Create Lead
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialMedia;
