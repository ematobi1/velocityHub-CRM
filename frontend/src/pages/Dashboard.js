import React from 'react';
import { useQuery } from 'react-query';
import { leadsAPI } from '../utils/api';
import { FiUsers, FiTrendingUp, FiStar, FiActivity } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function Dashboard() {
  const { data: stats, isLoading } = useQuery('leadStats', leadsAPI.getStats);

  const statCards = [
    {
      title: 'Total Leads',
      value: stats?.total || 0,
      icon: FiUsers,
      color: 'bg-blue-500',
      change: '+12% from last month'
    },
    {
      title: 'Qualified Leads',
      value: stats?.byStatus?.qualified || 0,
      icon: FiTrendingUp,
      color: 'bg-green-500',
      change: '+8% from last month'
    },
    {
      title: 'Avg AI Score',
      value: Math.round(stats?.averageAIScore || 0),
      icon: FiStar,
      color: 'bg-yellow-500',
      suffix: '/100',
      change: 'Across all leads'
    },
    {
      title: 'New This Week',
      value: stats?.recentlyCreated || 0,
      icon: FiActivity,
      color: 'bg-purple-500',
      change: 'Last 7 days'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header with Video Background */}
      <div className="relative h-64 overflow-hidden rounded-lg">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/assets/videos/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-primary-800/70 to-transparent"></div>

        {/* Content */}
        <div className="relative h-full flex items-center px-8">
          <div className="flex items-center space-x-6">
            {/* Hero Image */}
            <div className="hidden md:block w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl">
              <img
                src="/assets/images/background-hero.jpg"
                alt="VelocityHub"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Welcome Message */}
            <div className="text-white">
              <h1 className="text-4xl font-bold drop-shadow-lg">Dashboard</h1>
              <p className="text-xl mt-2 text-primary-100 drop-shadow-md">
                Welcome back! Here's your sales overview.
              </p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">System Active</span>
                </div>
                <div className="text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}{stat.suffix || ''}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Status</h3>
          <div className="space-y-3">
            {stats?.byStatus && Object.entries(stats.byStatus).map(([status, count]) => {
              const percentage = ((count / stats.total) * 100).toFixed(1);
              const colors = {
                new: 'bg-blue-500',
                contacted: 'bg-yellow-500',
                qualified: 'bg-green-500',
                unqualified: 'bg-red-500',
                converted: 'bg-purple-500',
                lost: 'bg-gray-500'
              };

              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                    <span className="font-medium text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[status] || 'bg-gray-500'} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Source */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Source</h3>
          <div className="space-y-3">
            {stats?.bySource && Object.entries(stats.bySource).map(([source, count]) => {
              const percentage = ((count / stats.total) * 100).toFixed(1);
              const colors = {
                website: 'bg-blue-500',
                referral: 'bg-green-500',
                cold_call: 'bg-yellow-500',
                email: 'bg-purple-500',
                social_media: 'bg-pink-500',
                event: 'bg-indigo-500',
                partner: 'bg-teal-500'
              };

              return (
                <div key={source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{source.replace('_', ' ')}</span>
                    <span className="font-medium text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[source] || 'bg-gray-500'} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/leads?status=new"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">View New Leads</p>
              <p className="text-xs text-gray-500 mt-1">{stats?.byStatus?.new || 0} leads awaiting contact</p>
            </div>
          </Link>

          <Link
            to="/leads?sort=-aiScore.overall&limit=20"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Hot Leads</p>
              <p className="text-xs text-gray-500 mt-1">Top scored opportunities</p>
            </div>
          </Link>

          <Link
            to="/leads?status=qualified"
            className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Qualified Leads</p>
              <p className="text-xs text-gray-500 mt-1">{stats?.byStatus?.qualified || 0} ready to close</p>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Dashboard;
