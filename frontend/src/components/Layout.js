import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiUsers, FiLogOut, FiMenu, FiX, FiTrello, FiBriefcase, FiHeadphones, FiActivity, FiZap, FiLinkedin, FiDatabase, FiCpu, FiHeart, FiGlobe, FiTrendingUp, FiMessageCircle, FiSettings, FiSearch, FiBarChart2 } from 'react-icons/fi';
import ChatWidget from './ChatWidget';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import websocketService from '../services/websocket';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !websocketService.isConnected()) {
      websocketService.connect(token);
    }

    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
  const handleGlobalKeydown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(open => !open);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [handleGlobalKeydown]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/', icon: FiHome },
    { name: 'Leads', path: '/leads', icon: FiUsers },
    { name: 'Pipeline', path: '/pipeline', icon: FiTrello },
    { name: 'Companies', path: '/companies', icon: FiBriefcase },
    { name: 'Analytics', path: '/analytics', icon: FiBarChart2 },
    { name: 'Conversation AI', path: '/conversation-intelligence', icon: FiActivity },
    { name: 'Workflows', path: '/workflows', icon: FiZap },
    { name: 'Social Media', path: '/social-media', icon: FiLinkedin },
    { name: 'Lead Enrichment', path: '/lead-enrichment', icon: FiDatabase },
    { name: 'AI Agents', path: '/ai-agents', icon: FiCpu },
    { name: 'Customer Health', path: '/customer-health', icon: FiHeart },
    { name: 'Relationship Map', path: '/relationship-map', icon: FiGlobe },
    { name: 'Customer Service', path: '/customer-service', icon: FiHeadphones },
    { name: 'Revenue Intel', path: '/revenue-intelligence', icon: FiTrendingUp },
    { name: 'WhatsApp', path: '/whatsapp', icon: FiMessageCircle },
    { name: 'Settings', path: '/settings', icon: FiSettings },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const currentPage = navigation.find((item) => isActive(item.path))?.name || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3 min-w-0">
              <img
                src="/assets/images/nav-logo.jpg"
                alt="VelocityHub"
                className="w-8 h-8 rounded-lg object-cover shadow-sm flex-shrink-0"
              />
              <h1 className="text-lg font-bold text-primary-600 truncate">VelocityHub</h1>
            </div>
          ) : (
            <img
              src="/assets/images/nav-logo.jpg"
              alt="VelocityHub"
              className="w-8 h-8 rounded-lg object-cover shadow-sm mx-auto"
            />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 ml-1"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.name : undefined}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                  active
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="ml-3 truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 mt-1">
                  {user?.subscription?.tier || 'free'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FiLogOut size={14} className="mr-2" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{currentPage}</h2>
          <div className="flex items-center gap-3">
            {/* Command palette trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiSearch size={14} />
              <span>Search</span>
              <kbd className="text-xs text-gray-400 bg-white border border-gray-200 px-1 rounded font-mono">
                ⌘K
              </kbd>
            </button>
            <div className="text-sm text-gray-500">
              {user?.usage && user?.limits && (
                <span>
                  {user.limits.contacts === -1
                    ? 'Unlimited contacts'
                    : `${user.usage.contacts || 0}/${user.limits.contacts} contacts`}
                </span>
              )}
            </div>
            <NotificationCenter />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* AI Chatbot Widget */}
      <ChatWidget />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default Layout;
