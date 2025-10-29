import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { analyticsAPI } from '../utils/api';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
  FiTarget,
  FiUsers,
  FiAward,
  FiPieChart
} from 'react-icons/fi';

function Analytics() {
  const [period, setPeriod] = useState('6months');

  // Fetch all analytics data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery(
    'analytics-dashboard',
    analyticsAPI.getDashboard
  );

  const { data: forecast } = useQuery(
    'analytics-forecast',
    analyticsAPI.getRevenueForecast
  );

  const { data: funnel } = useQuery('analytics-funnel', analyticsAPI.getFunnel);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value}%`;
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const { overview, leadSources, dealStages, topPerformers } = dashboard || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-1">
            Track your sales performance and key metrics
          </p>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(overview?.totalRevenue || 0)}
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
              <p className="text-sm text-gray-600">Revenue This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(overview?.revenueThisMonth || 0)}
              </p>
              <div className="flex items-center mt-1">
                {overview?.revenueGrowth >= 0 ? (
                  <FiTrendingUp className="text-green-500 mr-1" size={14} />
                ) : (
                  <FiTrendingDown className="text-red-500 mr-1" size={14} />
                )}
                <span
                  className={`text-xs font-medium ${
                    overview?.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatPercent(overview?.revenueGrowth || 0)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiTrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pipeline Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(overview?.pipelineValue || 0)}
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
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overview?.winRate || 0}%
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiTarget className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {overview?.totalLeads || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                +{overview?.newLeadsThisMonth || 0} this month
              </p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiUsers className="text-gray-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Deals</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {overview?.activeDeals || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {overview?.totalDeals || 0} total deals
              </p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiActivity className="text-gray-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deals Won</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {overview?.wonDealsThisMonth || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiAward className="text-gray-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weighted Pipeline</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(overview?.weightedPipeline || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Expected value</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <FiPieChart className="text-gray-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
          <div className="space-y-3">
            {leadSources?.map((source, index) => {
              const total = leadSources.reduce((sum, s) => sum + s.count, 0);
              const percentage = ((source.count / total) * 100).toFixed(1);
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {source._id}
                    </span>
                    <span className="text-sm text-gray-600">
                      {source.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal Stages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Deal Stage Distribution
          </h3>
          <div className="space-y-3">
            {dealStages?.map((stage, index) => {
              const total = dealStages.reduce((sum, s) => sum + s.count, 0);
              const percentage = ((stage.count / total) * 100).toFixed(1);
              const colors = {
                prospecting: 'bg-gray-500',
                qualification: 'bg-blue-500',
                proposal: 'bg-yellow-500',
                negotiation: 'bg-orange-500',
                closed_won: 'bg-green-500',
                closed_lost: 'bg-red-500'
              };
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {stage._id.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {stage.count} ({formatCurrency(stage.value)})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[stage._id] || 'bg-gray-500'} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      {funnel && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="space-y-2">
            {funnel.funnel?.map((stage, index) => (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-700">
                  {stage.stage}
                </div>
                <div className="flex-1 flex items-center">
                  <div
                    className="bg-gradient-to-r from-primary-600 to-primary-400 h-10 rounded flex items-center justify-between px-4 text-white font-medium transition-all"
                    style={{ width: `${stage.percentage}%`, minWidth: '120px' }}
                  >
                    <span>{stage.count}</span>
                    <span className="text-sm">{stage.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      {topPerformers && topPerformers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performers This Month
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Deals Won
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topPerformers.map((performer, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {performer.name}
                        </div>
                        <div className="text-xs text-gray-500">{performer.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(performer.revenue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{performer.deals}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
