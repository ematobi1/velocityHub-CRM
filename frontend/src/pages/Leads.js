import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { leadsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiMail, FiPhone, FiStar } from 'react-icons/fi';
import LeadModal from '../components/LeadModal';

function Leads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const queryClient = useQueryClient();

  // Fetch leads
  const { data, isLoading } = useQuery(
    ['leads', page, search, status, source],
    () => leadsAPI.getAll({ page, limit: 50, search, status, source }),
    {
      keepPreviousData: true
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(leadsAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('leads');
      toast.success('Lead deleted successfully');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to delete lead');
    }
  });

  // Create mutation
  const createMutation = useMutation(leadsAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('leads');
      toast.success('Lead created successfully');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to create lead');
    }
  });

  // Update mutation
  const updateMutation = useMutation(
    ({ id, data }) => leadsAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('leads');
        toast.success('Lead updated successfully');
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to update lead');
      }
    }
  );

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleSaveLead = async (formData) => {
    if (selectedLead) {
      await updateMutation.mutateAsync({ id: selectedLead._id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      unqualified: 'bg-red-100 text-red-800',
      converted: 'bg-purple-100 text-purple-800',
      lost: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const leads = data?.leads || [];
  const pagination = data?.pagination || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            Manage your {pagination.total || 0} leads with AI-powered insights
          </p>
        </div>
        <button onClick={handleAddLead} className="btn btn-primary flex items-center">
          <FiPlus className="mr-2" />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search leads by name, email, or company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Sources</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="cold_call">Cold Call</option>
              <option value="email">Email</option>
              <option value="social_media">Social Media</option>
              <option value="event">Event</option>
              <option value="partner">Partner</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(search || status || source) && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {search && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
                Search: {search}
                <button onClick={() => setSearch('')} className="ml-2 hover:text-primary-900">×</button>
              </span>
            )}
            {status && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
                Status: {status}
                <button onClick={() => setStatus('')} className="ml-2 hover:text-primary-900">×</button>
              </span>
            )}
            {source && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
                Source: {source}
                <button onClick={() => setSource('')} className="ml-2 hover:text-primary-900">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
                setSource('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center p-12">
            <FiSearch size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AI Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {lead.firstName[0]}{lead.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.firstName} {lead.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{lead.jobTitle || 'No title'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lead.company || '-'}</div>
                        <div className="text-sm text-gray-500">{lead.industry || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <a href={`mailto:${lead.email}`} className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                            <FiMail size={14} className="mr-1" />
                            {lead.email}
                          </a>
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="text-sm text-gray-600 hover:text-gray-700 flex items-center">
                              <FiPhone size={14} className="mr-1" />
                              {lead.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiStar className="mr-1 text-yellow-500" size={16} />
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreBadgeColor(lead.aiScore?.overall || 0)}`}>
                            {lead.aiScore?.overall || 0}/100
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {lead.source?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditLead(lead)}
                            className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded"
                            title="Edit"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(lead._id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * 50) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * 50, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md"
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {pagination.pages > 5 && (
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                    )}
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lead Modal */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLead(null);
        }}
        onSave={handleSaveLead}
        lead={selectedLead}
      />
    </div>
  );
}

export default Leads;
