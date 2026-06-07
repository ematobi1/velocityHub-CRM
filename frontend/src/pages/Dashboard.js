import React from 'react';
import { useQuery } from 'react-query';
import { leadsAPI, dealsAPI, companiesAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiTrendingUp, FiDollarSign, FiTarget,
  FiArrowUp, FiActivity, FiZap,
  FiStar, FiRefreshCw
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const STAGE_COLORS = {
  prospecting: '#6b7280',
  qualification: '#3b82f6',
  proposal: '#f59e0b',
  negotiation: '#f97316',
  closed_won: '#22c55e',
  closed_lost: '#ef4444',
};

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {trend && (
            <div className={`flex items-center mt-1.5 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
              <FiArrowUp size={12} className="mr-1" />
              {trend}
            </div>
          )}
          {subtitle && !trend && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`${color} p-3 rounded-xl flex-shrink-0 ml-4`}>
          <Icon className="text-white" size={20} />
        </div>
      </div>
    </div>
  );
}

function AiBriefing({ leadStats, dealAnalytics }) {
  const hotLeads = leadStats?.byStatus?.qualified || 0;
  const newLeads = leadStats?.byStatus?.new || 0;
  const pipelineValue = dealAnalytics?.totalValue || 0;
  const winRate = dealAnalytics?.winRate || 0;

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);

  const insights = [];
  if (newLeads > 0) insights.push(`${newLeads} new lead${newLeads !== 1 ? 's' : ''} awaiting first contact`);
  if (hotLeads > 0) insights.push(`${hotLeads} qualified lead${hotLeads !== 1 ? 's' : ''} ready to close`);
  if (pipelineValue > 0) insights.push(`${formatCurrency(pipelineValue)} total pipeline value tracked`);
  if (winRate > 0) insights.push(`${winRate.toFixed(1)}% win rate across all deals`);
  if (insights.length === 0) insights.push('Add leads and deals to unlock AI-powered insights');

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-5 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <FiZap size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-primary-100 mb-1">AI Daily Briefing</p>
          <p className="font-bold text-lg leading-snug">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <ul className="mt-2 space-y-1">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-primary-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white/60 rounded-full flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PipelineChart({ dealsData }) {
  const grouped = dealsData?.grouped || {};
  const chartData = Object.entries(grouped).map(([stage, deals]) => ({
    stage: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    deals: deals.length,
    fill: STAGE_COLORS[stage] || '#6b7280',
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No deals yet — create your first deal in the Pipeline
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(val) => [val, 'Deals']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="deals" fill="#0284c7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LeadStatusBars({ stats }) {
  const statuses = stats?.byStatus ? Object.entries(stats.byStatus) : [];
  const total = stats?.total || 1;

  const colors = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    qualified: 'bg-green-500',
    unqualified: 'bg-red-500',
    converted: 'bg-purple-500',
    lost: 'bg-gray-400',
  };

  return (
    <div className="space-y-2.5">
      {statuses.map(([status, count]) => {
        const pct = ((count / total) * 100).toFixed(1);
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 capitalize font-medium">{status.replace('_', ' ')}</span>
              <span className="text-gray-500">{count} <span className="text-gray-400">({pct}%)</span></span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`${colors[status] || 'bg-gray-400'} h-1.5 rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {statuses.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">No lead data yet</p>
      )}
    </div>
  );
}

function LeadSnapshot({ stats, companyStats, dealAnalytics, refetchLeads }) {
  const items = [
    { label: 'Qualified leads', count: stats?.byStatus?.qualified || 0, color: 'text-green-700 bg-green-50', link: '/leads?status=qualified' },
    { label: 'New leads', count: stats?.byStatus?.new || 0, color: 'text-blue-700 bg-blue-50', link: '/leads?status=new' },
    { label: 'Avg AI score', count: `${Math.round(stats?.averageAIScore || 0)}/100`, color: 'text-yellow-700 bg-yellow-50', link: '/leads' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Lead Snapshot</h3>
        <button
          onClick={refetchLeads}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh"
        >
          <FiRefreshCw size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.link}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${item.color}`}>
              {item.count}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{companyStats?.total || 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Companies</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{dealAnalytics?.totalDeals || 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Deals</p>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Add Lead', path: '/leads', icon: FiUsers, color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'New Deal', path: '/pipeline', icon: FiTarget, color: 'bg-green-500 hover:bg-green-600' },
    { label: 'Run Workflow', path: '/workflows', icon: FiZap, color: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'AI Agents', path: '/ai-agents', icon: FiActivity, color: 'bg-orange-500 hover:bg-orange-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            to={action.path}
            className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors shadow-sm hover:shadow-md`}
          >
            <Icon size={22} />
            <span className="text-xs font-semibold">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: leadStats, isLoading: leadsLoading, refetch: refetchLeads } = useQuery(
    'leadStats',
    leadsAPI.getStats,
    { staleTime: 60000 }
  );

  const { data: dealAnalytics, isLoading: dealsLoading } = useQuery(
    'deals-analytics',
    dealsAPI.getAnalytics,
    { staleTime: 60000 }
  );

  const { data: dealsData } = useQuery(
    'deals-pipeline',
    () => dealsAPI.getAll({ groupBy: 'stage' }),
    { staleTime: 60000 }
  );

  const { data: companyStats } = useQuery(
    'company-stats',
    companiesAPI.getStats,
    { staleTime: 120000 }
  );

  const isLoading = leadsLoading && dealsLoading;

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Leads',
      value: leadStats?.total || 0,
      icon: FiUsers,
      color: 'bg-blue-500',
      trend: leadStats?.recentlyCreated > 0 ? `+${leadStats.recentlyCreated} this week` : null,
      trendUp: true,
      subtitle: `${leadStats?.recentlyCreated || 0} added this week`,
    },
    {
      title: 'Pipeline Value',
      value: formatCurrency(dealAnalytics?.totalValue),
      icon: FiDollarSign,
      color: 'bg-green-500',
      subtitle: `${dealAnalytics?.totalDeals || 0} active deals`,
    },
    {
      title: 'Win Rate',
      value: dealAnalytics ? `${dealAnalytics.winRate?.toFixed(1) || 0}%` : '—',
      subtitle: 'Closed won vs. total closed',
      icon: FiTrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'AI Score Avg',
      value: `${Math.round(leadStats?.averageAIScore || 0)}/100`,
      subtitle: 'Across all leads',
      icon: FiStar,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Welcome + Briefing Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">👋</span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 truncate">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </p>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">All systems operational</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <AiBriefing leadStats={leadStats} dealAnalytics={dealAnalytics} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Pipeline by Stage</h3>
            <Link to="/pipeline" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              View pipeline →
            </Link>
          </div>
          <PipelineChart dealsData={dealsData} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Leads by Status</h3>
            <Link to="/leads" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </Link>
          </div>
          <LeadStatusBars stats={leadStats} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <LeadSnapshot
            stats={leadStats}
            companyStats={companyStats}
            dealAnalytics={dealAnalytics}
            refetchLeads={refetchLeads}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <QuickActions />
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Explore Features</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Revenue Intelligence', path: '/revenue-intelligence', desc: 'AI-powered forecasting' },
                { label: 'Customer Health', path: '/customer-health', desc: 'Churn risk scoring' },
                { label: 'Relationship Map', path: '/relationship-map', desc: 'Network visualization' },
                { label: 'Conversation AI', path: '/conversation-intelligence', desc: 'Call & chat analysis' },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
