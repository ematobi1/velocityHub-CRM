import React, { useState, useEffect, useCallback } from 'react';
import { revenueIntelligenceAPI } from '../utils/api';
import { FiAlertTriangle, FiTrendingUp, FiDollarSign, FiUsers, FiClock, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import toast from 'react-hot-toast';

const RISK_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-600', border: 'border-red-200' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-500', border: 'border-orange-200' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', badge: 'bg-yellow-500', border: 'border-yellow-200' },
  low: { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-600', border: 'border-green-200' }
};

const SEVERITY_COLORS = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-gray-600'
};

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

function SummaryCard({ icon: Icon, label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon size={18} className="text-gray-400" />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function DealRow({ deal }) {
  const [open, setOpen] = useState(false);
  const c = RISK_COLORS[deal.riskLevel] || RISK_COLORS.low;

  return (
    <div className={`border rounded-xl mb-3 overflow-hidden ${c.border}`}>
      <button
        type="button"
        className={`w-full flex items-center justify-between px-4 py-3 ${c.bg} hover:brightness-95 transition-all`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 text-left">
          <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full text-white ${c.badge}`}>
            {deal.riskLevel}
          </span>
          <span className="font-semibold text-gray-900 text-sm">{deal.name}</span>
          <span className="text-xs text-gray-600 hidden sm:block">
            {deal.owner?.firstName} {deal.owner?.lastName}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-900 text-sm">{fmt(deal.value || 0)}</span>
          <span className="text-xs text-gray-500 capitalize hidden sm:block">{deal.stage?.replace('_', ' ')}</span>
          {open ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="bg-white px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {deal.riskFactors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Risk Factors</p>
              <ul className="space-y-2">
                {deal.riskFactors.map((f, i) => (
                  <li key={i} className="text-sm">
                    <span className={`font-medium ${SEVERITY_COLORS[f.severity] || 'text-gray-700'}`}>{f.factor}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {deal.recommendedActions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Next Best Actions</p>
              <ul className="space-y-2">
                {deal.recommendedActions.map((a, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-primary-600">{a.action}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{a.reason} · <span className="text-green-600">{a.estimatedImpact}</span></p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {deal.positiveSignals?.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Positive Signals</p>
              <div className="flex flex-wrap gap-2">
                {deal.positiveSignals.map((s, i) => (
                  <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">{s.signal}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RevenueIntelligence() {
  const [data, setData] = useState(null);
  const [repData, setRepData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pipeline');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, reps] = await Promise.allSettled([
        revenueIntelligenceAPI.getOverview(),
        revenueIntelligenceAPI.getRepPerformance()
      ]);
      if (overview.status === 'fulfilled') setData(overview.value);
      if (reps.status === 'fulfilled') setRepData(reps.value);
    } catch (err) {
      toast.error('Failed to load revenue intelligence');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const s = data?.summary || {};
  const deals = (data?.allDeals || []).filter(d => filter === 'all' || d.riskLevel === filter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">Signal-based deal risk scoring — no Clari required</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={FiDollarSign} label="Total Pipeline" value={fmt(s.totalPipeline || 0)} sub={`${s.totalDeals || 0} open deals`} />
        <SummaryCard icon={FiAlertTriangle} label="At-Risk Value" value={fmt(s.atRiskValue || 0)} sub={`${s.atRiskCount || 0} deals at risk`} color="text-red-600" />
        <SummaryCard icon={FiTrendingUp} label="Signal Forecast" value={fmt(s.signalForecast || 0)} sub={`Rep forecast: ${fmt(s.repForecast || 0)}`} />
        <SummaryCard icon={FiClock} label="Stalled Deals" value={s.stalledCount || 0} sub={`${s.singleThreadedCount || 0} single-threaded`} color={s.stalledCount > 3 ? 'text-orange-600' : 'text-gray-900'} />
      </div>

      {/* Forecast gap callout */}
      {s.forecastGap > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <FiAlertTriangle className="text-amber-600 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-800">Forecast gap detected</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Rep-reported forecast is <strong>{fmt(s.forecastGap)}</strong> higher than signal-adjusted forecast.
              {' '}This gap typically reflects optimism bias on stalled or overdue deals.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[['pipeline', 'Pipeline Risk'], ['reps', 'Rep Performance']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pipeline tab */}
      {tab === 'pipeline' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'critical', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                  filter === f ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:border-primary-400'
                }`}
              >
                {f === 'all' ? `All (${data?.allDeals?.length || 0})` : `${f} (${data?.allDeals?.filter(d => d.riskLevel === f).length || 0})`}
              </button>
            ))}
          </div>

          {deals.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No deals in this risk category.</p>
          ) : (
            deals.map(deal => <DealRow key={deal._id} deal={deal} />)
          )}
        </div>
      )}

      {/* Rep performance tab */}
      {tab === 'reps' && (
        <div className="overflow-x-auto">
          {!repData?.reps?.length ? (
            <p className="text-gray-500 text-sm py-8 text-center">Rep performance data not available for your role.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-medium text-gray-500">Rep</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Open Deals</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Pipeline</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Won Value</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Win Rate</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Avg Risk</th>
                </tr>
              </thead>
              <tbody>
                {repData.reps.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">
                      {r.rep?.firstName} {r.rep?.lastName}
                      <span className="block text-xs text-gray-400">{r.rep?.email}</span>
                    </td>
                    <td className="py-3 text-right text-gray-600">{r.openDeals}</td>
                    <td className="py-3 text-right text-gray-700 font-medium">{fmt(r.openValue)}</td>
                    <td className="py-3 text-right text-green-700 font-semibold">{fmt(r.wonValue)}</td>
                    <td className="py-3 text-right">
                      {r.winRate !== null ? (
                        <span className={r.winRate >= 50 ? 'text-green-600 font-medium' : 'text-orange-600'}>{r.winRate}%</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 text-right">
                      <span className={r.avgRisk >= 50 ? 'text-red-600 font-medium' : r.avgRisk >= 25 ? 'text-orange-600' : 'text-green-600'}>
                        {r.avgRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
