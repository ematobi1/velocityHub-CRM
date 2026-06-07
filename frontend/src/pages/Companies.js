import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { companiesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import CompanyModal from '../components/CompanyModal';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiBriefcase,
  FiGlobe,
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Other'
];

const EMPLOYEE_COUNTS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+'
];

function Companies() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
    employeeCount: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Fetch companies
  const { data, isLoading } = useQuery(
    ['companies', { search: searchTerm, ...filters }],
    () => companiesAPI.getAll({ search: searchTerm, ...filters }),
    {
      keepPreviousData: true
    }
  );

  // Fetch stats
  const { data: stats } = useQuery('companies-stats', companiesAPI.getStats);

  // Create mutation
  const createMutation = useMutation(companiesAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('companies');
      queryClient.invalidateQueries('companies-stats');
      toast.success('Company created successfully');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to create company');
    }
  });

  // Update mutation
  const updateMutation = useMutation(
    ({ id, data }) => companiesAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        queryClient.invalidateQueries('companies-stats');
        toast.success('Company updated successfully');
      },
      onError: (error) => {
        toast.error(error.error || 'Failed to update company');
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(companiesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('companies');
      queryClient.invalidateQueries('companies-stats');
      toast.success('Company archived successfully');
    },
    onError: (error) => {
      toast.error(error.error || 'Failed to archive company');
    }
  });

  const handleSaveCompany = async (formData) => {
    if (selectedCompany) {
      await updateMutation.mutateAsync({ id: selectedCompany._id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    toast((t) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Archive this company?</span>
        <button
          onClick={async () => { toast.dismiss(t.id); await deleteMutation.mutateAsync(id); }}
          style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Archive
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Cancel
        </button>
      </span>
    ), { duration: 8000 });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header with Background Image */}
      <div
        className="relative h-64 bg-cover bg-center rounded-lg overflow-hidden"
        style={{ backgroundImage: 'url(/images/companies-header.jpg)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-gray-900/60"></div>
        <div className="relative h-full flex items-center justify-between p-8">
          <div className="text-white">
            <h1 className="text-4xl font-bold mb-2">Companies</h1>
            <p className="text-gray-200 text-lg">
              Manage your company accounts and relationships
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCompany(null);
              setIsModalOpen(true);
            }}
            className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold flex items-center shadow-lg transition-all"
          >
            <FiPlus className="mr-2" size={20} />
            Add Company
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6">

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Companies</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalCompanies}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiBriefcase className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FiDollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Pipeline</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.activePipeline)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiTrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Industry Filter */}
          <select
            value={filters.industry}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>

          {/* Employee Count Filter */}
          <select
            value={filters.employeeCount}
            onChange={(e) => setFilters({ ...filters, employeeCount: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Sizes</option>
            {EMPLOYEE_COUNTS.map(count => (
              <option key={count} value={count}>{count} employees</option>
            ))}
          </select>
        </div>
      </div>

      {/* Companies List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health Score
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.companies?.map((company) => (
                  <tr key={company._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <FiBriefcase className="text-primary-600" size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                            >
                              <FiGlobe size={12} className="mr-1" />
                              {company.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{company.industry || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{company.employeeCount || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <FiUsers size={14} className="mr-1 text-gray-400" />
                        {company.contacts?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <FiActivity size={14} className="mr-1 text-gray-400" />
                        {company.deals?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {company.healthScore ? (
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                company.healthScore >= 70
                                  ? 'bg-green-500'
                                  : company.healthScore >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${company.healthScore}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{company.healthScore}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(company._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Archive"
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

          {/* Empty State */}
          {data?.companies?.length === 0 && (
            <div className="text-center py-12">
              <FiBriefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new company.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary inline-flex items-center"
                >
                  <FiPlus className="mr-2" />
                  Add Company
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCompany(null);
        }}
        onSave={handleSaveCompany}
        company={selectedCompany}
      />
      </div>
    </div>
  );
}

export default Companies;
