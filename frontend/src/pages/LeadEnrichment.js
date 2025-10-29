import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiSearch,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiZap,
  FiDatabase,
  FiRefreshCw,
  FiUsers
} from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function LeadEnrichment() {
  const queryClient = useQueryClient();
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [findEmailForm, setFindEmailForm] = useState({
    firstName: '',
    lastName: '',
    companyDomain: ''
  });
  const [verifyEmailForm, setVerifyEmailForm] = useState('');

  // Fetch usage stats
  const { data: usage } = useQuery('enrichment-usage', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/lead-enrichment/usage`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Fetch leads
  const { data: leadsData, isLoading } = useQuery('leads-for-enrichment', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/leads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });

  // Enrich single lead mutation
  const enrichSingleMutation = useMutation(
    async (leadId) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/lead-enrichment/enrich/${leadId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Lead enriched successfully!');
        queryClient.invalidateQueries('leads-for-enrichment');
        queryClient.invalidateQueries('enrichment-usage');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Enrichment failed');
      }
    }
  );

  // Bulk enrich mutation
  const bulkEnrichMutation = useMutation(
    async (leadIds) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/lead-enrichment/bulk-enrich`,
        { leadIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`${data.successful} leads enriched, ${data.failed} failed`);
        setSelectedLeadIds([]);
        queryClient.invalidateQueries('leads-for-enrichment');
        queryClient.invalidateQueries('enrichment-usage');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Bulk enrichment failed');
      }
    }
  );

  // Find email mutation
  const findEmailMutation = useMutation(
    async (data) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/lead-enrichment/find-email`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(`Found email: ${data.email}`);
      }
    }
  );

  // Verify email mutation
  const verifyEmailMutation = useMutation(
    async (email) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/lead-enrichment/verify-email`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data.valid) {
          toast.success(`Email is valid (Score: ${data.score})`);
        } else {
          toast.error('Email is invalid');
        }
      }
    }
  );

  const handleBulkEnrich = () => {
    if (selectedLeadIds.length === 0) {
      toast.error('Please select leads to enrich');
      return;
    }
    bulkEnrichMutation.mutate(selectedLeadIds);
  };

  const handleFindEmail = (e) => {
    e.preventDefault();
    findEmailMutation.mutate(findEmailForm);
  };

  const handleVerifyEmail = (e) => {
    e.preventDefault();
    verifyEmailMutation.mutate(verifyEmailForm);
  };

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Enrichment</h1>
          <p className="text-gray-600 mt-1">
            Enrich your leads with verified contact data from multiple sources
          </p>
        </div>
        {selectedLeadIds.length > 0 && (
          <button
            onClick={handleBulkEnrich}
            disabled={bulkEnrichMutation.isLoading}
            className="btn btn-primary flex items-center"
          >
            {bulkEnrichMutation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enriching...
              </>
            ) : (
              <>
                <FiZap className="mr-2" />
                Enrich Selected ({selectedLeadIds.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enriched Leads</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {usage.enrichedLeads}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiCheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {usage.thisMonth}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiDatabase className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credits Used</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {usage.creditsUsed}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiZap className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credits Remaining</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {usage.creditsRemaining}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiRefreshCw className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tools Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Find Email */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiSearch className="mr-2" />
            Find Email
          </h3>
          <form onSubmit={handleFindEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={findEmailForm.firstName}
                onChange={(e) => setFindEmailForm({ ...findEmailForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={findEmailForm.lastName}
                onChange={(e) => setFindEmailForm({ ...findEmailForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Domain
              </label>
              <input
                type="text"
                value={findEmailForm.companyDomain}
                onChange={(e) => setFindEmailForm({ ...findEmailForm, companyDomain: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="company.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={findEmailMutation.isLoading}
              className="w-full btn btn-primary"
            >
              {findEmailMutation.isLoading ? 'Searching...' : 'Find Email'}
            </button>
            {findEmailMutation.data && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-sm font-medium text-green-900">Found Email:</p>
                <p className="text-lg font-semibold text-green-700 mt-1">
                  {findEmailMutation.data.email}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Confidence: {findEmailMutation.data.confidence}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Verify Email */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiCheckCircle className="mr-2" />
            Verify Email
          </h3>
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={verifyEmailForm}
                onChange={(e) => setVerifyEmailForm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="john@company.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={verifyEmailMutation.isLoading}
              className="w-full btn btn-primary"
            >
              {verifyEmailMutation.isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            {verifyEmailMutation.data && (
              <div className={`rounded-lg p-3 ${verifyEmailMutation.data.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm font-medium ${verifyEmailMutation.data.valid ? 'text-green-900' : 'text-red-900'}`}>
                  {verifyEmailMutation.data.valid ? '✓ Valid Email' : '✗ Invalid Email'}
                </p>
                <p className={`text-xs mt-1 ${verifyEmailMutation.data.valid ? 'text-green-600' : 'text-red-600'}`}>
                  Deliverable: {verifyEmailMutation.data.deliverable ? 'Yes' : 'No'} |
                  Score: {verifyEmailMutation.data.score}/100
                </p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
          {selectedLeadIds.length > 0 && (
            <button
              onClick={() => setSelectedLeadIds([])}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Selection
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : leadsData?.leads?.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add leads to start enriching their data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length === leadsData?.leads?.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeadIds(leadsData.leads.map(l => l._id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leadsData?.leads?.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead._id)}
                        onChange={() => toggleLeadSelection(lead._id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.firstName} {lead.lastName}
                      </div>
                      {lead.jobTitle && (
                        <div className="text-xs text-gray-500">{lead.jobTitle}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{lead.company || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm">
                        {lead.email ? (
                          <>
                            <FiMail className="mr-1 text-green-600" size={14} />
                            <span className="text-gray-900">{lead.email}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm">
                        {lead.phone ? (
                          <>
                            <FiPhone className="mr-1 text-green-600" size={14} />
                            <span className="text-gray-900">{lead.phone}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.lastEnriched ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Enriched
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          Not Enriched
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => enrichSingleMutation.mutate(lead._id)}
                        disabled={enrichSingleMutation.isLoading}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        {enrichSingleMutation.isLoading ? 'Enriching...' : 'Enrich'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadEnrichment;
