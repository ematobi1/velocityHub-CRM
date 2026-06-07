import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiHome, FiUsers, FiTrello, FiBriefcase, FiActivity,
  FiZap, FiLinkedin, FiDatabase, FiCpu, FiHeart, FiGlobe,
  FiHeadphones, FiTrendingUp, FiMessageCircle, FiSettings,
  FiBarChart2, FiArrowRight
} from 'react-icons/fi';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: FiHome, category: 'Pages' },
  { label: 'Leads', path: '/leads', icon: FiUsers, category: 'Pages' },
  { label: 'Pipeline', path: '/pipeline', icon: FiTrello, category: 'Pages' },
  { label: 'Companies', path: '/companies', icon: FiBriefcase, category: 'Pages' },
  { label: 'Analytics', path: '/analytics', icon: FiBarChart2, category: 'Pages' },
  { label: 'Conversation AI', path: '/conversation-intelligence', icon: FiActivity, category: 'Pages' },
  { label: 'Workflows', path: '/workflows', icon: FiZap, category: 'Pages' },
  { label: 'Social Media', path: '/social-media', icon: FiLinkedin, category: 'Pages' },
  { label: 'Lead Enrichment', path: '/lead-enrichment', icon: FiDatabase, category: 'Pages' },
  { label: 'AI Agents', path: '/ai-agents', icon: FiCpu, category: 'Pages' },
  { label: 'Customer Health', path: '/customer-health', icon: FiHeart, category: 'Pages' },
  { label: 'Relationship Map', path: '/relationship-map', icon: FiGlobe, category: 'Pages' },
  { label: 'Customer Service', path: '/customer-service', icon: FiHeadphones, category: 'Pages' },
  { label: 'Revenue Intelligence', path: '/revenue-intelligence', icon: FiTrendingUp, category: 'Pages' },
  { label: 'WhatsApp', path: '/whatsapp', icon: FiMessageCircle, category: 'Pages' },
  { label: 'Settings', path: '/settings', icon: FiSettings, category: 'Pages' },
];

function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  const handleSelect = useCallback((item) => {
    navigate(item.path);
    onClose();
    setQuery('');
    setSelectedIndex(0);
  }, [navigate, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex, handleSelect, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <FiSearch size={18} className="text-gray-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search pages, features, actions..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono ml-2">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {category}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.label}
                      onClick={() => handleSelect(item)}
                      className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={16} className={`mr-3 flex-shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className="flex-1 text-sm">{item.label}</span>
                      {isSelected && <FiArrowRight size={14} className="text-primary-400" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 border border-gray-200 px-1 rounded font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 border border-gray-200 px-1 rounded font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-100 border border-gray-200 px-1 rounded font-mono">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
