import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiUsers, FiLogOut, FiMenu, FiX, FiTrello, FiBriefcase, FiHeadphones, FiActivity, FiZap, FiLinkedin, FiDatabase, FiCpu, FiHeart, FiGlobe } from 'react-icons/fi';
import ChatWidget from './ChatWidget';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/', icon: FiHome },
    { name: 'Leads', path: '/leads', icon: FiUsers },
    { name: 'Pipeline', path: '/pipeline', icon: FiTrello },
    { name: 'Companies', path: '/companies', icon: FiBriefcase },
    { name: 'Conversation AI', path: '/conversation-intelligence', icon: FiActivity },
    { name: 'Workflows', path: '/workflows', icon: FiZap },
    { name: 'Social Media', path: '/social-media', icon: FiLinkedin },
    { name: 'Lead Enrichment', path: '/lead-enrichment', icon: FiDatabase },
    { name: 'AI Agents', path: '/ai-agents', icon: FiCpu },
    { name: 'Customer Health', path: '/customer-health', icon: FiHeart },
    { name: 'Relationship Map', path: '/relationship-map', icon: FiGlobe },
    { name: 'Customer Service', path: '/customer-service', icon: FiHeadphones },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <img
                src="/assets/images/nav-logo.jpg"
                alt="VelocityHub"
                className="w-10 h-10 rounded-lg object-cover shadow-sm"
              />
              <h1 className="text-xl font-bold text-primary-600">VelocityHub</h1>
            </div>
          ) : (
            <img
              src="/assets/images/nav-logo.jpg"
              alt="VelocityHub"
              className="w-10 h-10 rounded-lg object-cover shadow-sm mx-auto"
            />
          )}
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <FiX size={20} />
            </button>
          )}
        </div>

        {/* Toggle button when sidebar is closed */}
        {!sidebarOpen && (
          <div className="px-3 py-2 border-b border-gray-200">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full p-2 rounded-lg hover:bg-gray-100"
            >
              <FiMenu size={20} className="mx-auto" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                  {user?.subscription?.tier || 'free'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FiLogOut size={16} className="mr-2" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {navigation.find((item) => isActive(item.path))?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user?.usage && (
                <span>
                  {user.limits.contacts === -1 ? 'Unlimited' : `${user.usage.contacts || 0}/${user.limits.contacts}`} contacts
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* AI Chatbot Widget */}
      <ChatWidget />
    </div>
  );
}

export default Layout;
