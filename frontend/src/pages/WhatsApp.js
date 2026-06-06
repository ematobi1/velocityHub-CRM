import React, { useState, useEffect, useRef, useCallback } from 'react';
import { whatsappAPI } from '../utils/api';
import { FiSend, FiPhone, FiMessageSquare, FiRefreshCw, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

function formatPhone(phone) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return `+${d}`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ThreadList({ threads, selected, onSelect, loading }) {
  return (
    <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">WhatsApp</h2>
        <p className="text-xs text-gray-500 mt-0.5">Business messaging</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
          </div>
        ) : threads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No conversations yet</p>
        ) : (
          threads.map(t => (
            <button
              key={t.phone}
              type="button"
              onClick={() => onSelect(t.phone)}
              className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 text-left transition-colors ${selected === t.phone ? 'bg-primary-50' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FiPhone size={14} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{formatPhone(t.phone)}</p>
                <p className="text-xs text-gray-500 truncate">{t.lastMessage?.body?.slice(0, 40)}</p>
              </div>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{formatTime(t.lastMessage?.timestamp)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${isOut ? 'bg-green-500 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
        <p>{msg.body}</p>
        <p className={`text-xs mt-1 ${isOut ? 'text-green-100' : 'text-gray-400'}`}>{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}

export default function WhatsApp() {
  const [threads, setThreads] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [toPhone, setToPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const bottomRef = useRef(null);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await whatsappAPI.getThreads();
      setThreads(res.threads || []);
    } catch {
      // silently handle — Twilio might not be configured in dev
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadThread = useCallback(async (phone) => {
    setSelectedPhone(phone);
    try {
      const res = await whatsappAPI.getThread(phone);
      setMessages(res.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    whatsappAPI.getTemplates().then(r => setTemplates(r.templates || [])).catch(() => {});
  }, [loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const phone = selectedPhone || toPhone;
    if (!phone || !newMsg.trim()) return;

    setSending(true);
    try {
      const res = await whatsappAPI.send({ to: phone, body: newMsg.trim() });
      setMessages(prev => [...prev, res.message]);
      setNewMsg('');
      if (!selectedPhone) {
        setSelectedPhone(toPhone);
        setToPhone('');
        loadThreads();
      }
    } catch (err) {
      toast.error(err?.error || 'Failed to send message. Check Twilio configuration.');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (tpl) => {
    setNewMsg(tpl.body);
    setShowTemplates(false);
  };

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 4rem)' }}>
      <ThreadList threads={threads} selected={selectedPhone} onSelect={loadThread} loading={loadingThreads} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <FiMessageSquare size={18} className="text-green-600" />
            <span className="font-medium text-gray-900">
              {selectedPhone ? formatPhone(selectedPhone) : 'New conversation'}
            </span>
          </div>
          <button onClick={loadThreads} className="text-gray-400 hover:text-gray-600">
            <FiRefreshCw size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {!selectedPhone && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <FiMessageSquare size={28} className="text-green-600" />
              </div>
              <p className="text-gray-600 font-medium">Send a WhatsApp message</p>
              <p className="text-sm text-gray-400 mt-1">Enter a phone number below to start a conversation</p>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div className="border-t border-gray-200 bg-white p-3">
          {!selectedPhone && (
            <input
              type="tel"
              value={toPhone}
              onChange={e => setToPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full mb-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          )}

          <form onSubmit={send} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
                placeholder="Type a message…"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowTemplates(s => !s)}
                className="absolute right-2 bottom-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                Templates <FiChevronDown size={12} />
              </button>
              {showTemplates && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-xs font-medium text-gray-700">{t.name}</p>
                      <p className="text-xs text-gray-400 truncate">{t.body}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || !newMsg.trim()}
              className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-gray-300 transition-colors flex-shrink-0"
            >
              {sending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FiSend size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
