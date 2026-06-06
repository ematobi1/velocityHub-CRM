import React, { useState, useEffect, useCallback } from 'react';
import { ticketsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { FiPlus, FiMessageSquare, FiAlertCircle, FiCheckCircle, FiClock, FiSend, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200'
};

const STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600'
};

const STATUS_ICONS = {
  open: FiAlertCircle,
  in_progress: FiClock,
  waiting: FiClock,
  resolved: FiCheckCircle,
  closed: FiCheckCircle
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function NewTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium', category: 'general' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await ticketsAPI.create(form);
      toast.success(`Ticket ${res.ticket.ticketNumber} created`);
      onCreated(res.ticket);
      onClose();
    } catch (err) {
      toast.error(err?.error?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">New Support Ticket</h3>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief summary of the issue"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug">Bug Report</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Describe the issue in detail…"
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400">
              {loading ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, onUpdate }) {
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const isStaff = user?.role === 'admin' || user?.role === 'manager';

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await ticketsAPI.addMessage(ticket._id, reply.trim());
      toast.success('Reply sent');
      setReply('');
      const updated = await ticketsAPI.getById(ticket._id);
      onUpdate(updated.ticket);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      const res = await ticketsAPI.update(ticket._id, { status });
      onUpdate(res.ticket);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-mono">{ticket.ticketNumber}</p>
          <h3 className="font-semibold text-gray-900 mt-0.5">{ticket.subject}</h3>
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[ticket.priority]}`}>{ticket.priority}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
            <span className="text-xs text-gray-400">{ticket.category}</span>
          </div>
        </div>
        {isStaff && (
          <select
            value={ticket.status}
            onChange={e => updateStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.messages?.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${msg.sender === 'agent' ? 'bg-primary-50 text-gray-800 rounded-bl-sm' : 'bg-gray-100 text-gray-700 rounded-br-sm'}`}>
              <p className="font-medium text-xs text-gray-400 mb-1">{msg.senderName || (msg.sender === 'agent' ? 'Support Agent' : 'You')}</p>
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' && (
        <form onSubmit={sendReply} className="p-4 border-t border-gray-200 flex gap-2">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
            rows={2}
            placeholder="Type a reply…"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-gray-300 flex-shrink-0"
          >
            {sending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FiSend size={16} />}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CustomerService() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const [ticketRes, statsRes] = await Promise.all([
        ticketsAPI.getAll(params),
        ticketsAPI.getStats()
      ]);
      setTickets(ticketRes.tickets || []);
      setStats(statsRes);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSelect = async (ticket) => {
    try {
      const res = await ticketsAPI.getById(ticket._id);
      setSelected(res.ticket);
    } catch {
      setSelected(ticket);
    }
  };

  const handleUpdate = (updated) => {
    setSelected(updated);
    setTickets(prev => prev.map(t => t._id === updated._id ? updated : t));
  };

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Ticket list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Support Tickets</h2>
            <div className="flex gap-2">
              <button onClick={load} className="text-gray-400 hover:text-gray-600"><FiRefreshCw size={14} /></button>
              <button onClick={() => setShowNew(true)} className="flex items-center gap-1 text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">
                <FiPlus size={12} /> New
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatCard icon={FiAlertCircle} label="Open" value={stats.open || 0} color="text-blue-500" />
            <StatCard icon={FiCheckCircle} label="Resolved" value={stats.resolved || 0} color="text-green-500" />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5"
          >
            <option value="all">All tickets</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <FiMessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No tickets</p>
            </div>
          ) : (
            tickets.map(ticket => {
              const StatusIcon = STATUS_ICONS[ticket.status] || FiAlertCircle;
              return (
                <button
                  key={ticket._id}
                  type="button"
                  onClick={() => handleSelect(ticket)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?._id === ticket._id ? 'bg-primary-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                    <StatusIcon size={13} className={ticket.status === 'resolved' ? 'text-green-500' : 'text-gray-400'} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[ticket.priority]}`}>{ticket.priority}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLES[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket detail */}
      <div className="flex-1 bg-gray-50">
        {selected ? (
          <TicketDetail ticket={selected} onUpdate={handleUpdate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FiMessageSquare size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Select a ticket</p>
            <p className="text-sm text-gray-400 mt-1">or create a new one to get started</p>
            <button onClick={() => setShowNew(true)} className="mt-4 flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-primary-700">
              <FiPlus size={14} /> New Ticket
            </button>
          </div>
        )}
      </div>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={t => { setTickets(prev => [t, ...prev]); setSelected(t); }}
        />
      )}
    </div>
  );
}
