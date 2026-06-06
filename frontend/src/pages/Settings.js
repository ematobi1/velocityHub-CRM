import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { FiUser, FiLock, FiCreditCard, FiZap, FiCheck, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PLAN_FEATURES = {
  free: ['1,000 contacts', '5 pipelines', 'Basic analytics', 'Email support'],
  pro: ['Unlimited contacts', 'Unlimited pipelines', 'AI lead scoring', 'Revenue Intelligence', 'WhatsApp messaging', 'Workflow automation', 'Priority support'],
  enterprise: ['Everything in Pro', 'Custom AI models', 'SSO/SAML', 'Dedicated account manager', 'SLA guarantee', 'Custom integrations']
};

function ProfileTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setChangingPw(true);
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      toast.success('Password changed');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err?.error || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <form onSubmit={saveProfile} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Profile Information</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>
        <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <form onSubmit={changePw} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Change Password</h3>
        {['currentPassword', 'newPassword', 'confirm'].map((field, i) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {['Current password', 'New password', 'Confirm new password'][i]}
            </label>
            <input
              type="password"
              value={pwForm[field]}
              onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
        ))}
        <button type="submit" disabled={changingPw} className="px-5 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-400">
          {changingPw ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function BillingTab() {
  const { user } = useAuth();
  const tier = user?.subscription?.tier || 'free';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Current Plan</h3>
          <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-primary-100 text-primary-700">{tier}</span>
        </div>
        <div className="space-y-2">
          {(PLAN_FEATURES[tier] || PLAN_FEATURES.free).map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <FiCheck size={14} className="text-green-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Free', price: '$0', tier: 'free' },
          { name: 'Pro', price: '$49', tier: 'pro', popular: true },
          { name: 'Enterprise', price: '$99', tier: 'enterprise' }
        ].map(plan => (
          <div key={plan.tier} className={`bg-white rounded-xl border p-5 ${plan.popular ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200'}`}>
            {plan.popular && <p className="text-xs font-semibold text-primary-600 mb-2">Most Popular</p>}
            <p className="font-bold text-gray-900">{plan.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{plan.price}<span className="text-sm font-normal text-gray-500">/user/mo</span></p>
            <ul className="mt-3 space-y-1">
              {(PLAN_FEATURES[plan.tier] || []).slice(0, 4).map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <FiCheck size={12} className="text-green-500" /> {f}
                </li>
              ))}
            </ul>
            <button
              className={`mt-4 w-full py-2 text-sm rounded-lg ${tier === plan.tier ? 'bg-gray-100 text-gray-500 cursor-default' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
              disabled={tier === plan.tier}
            >
              {tier === plan.tier ? 'Current plan' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: 'WhatsApp Business', icon: FiMessageSquare, status: 'connected', desc: 'Send and receive WhatsApp messages from VelocityHub', color: 'text-green-600 bg-green-50' },
    { name: 'Email (SMTP)', icon: FiZap, status: process.env.REACT_APP_SMTP_CONFIGURED === 'true' ? 'connected' : 'configure', desc: 'Send automated emails from workflow actions', color: 'text-blue-600 bg-blue-50' },
    { name: 'Twilio Voice', icon: FiZap, status: 'connected', desc: 'Make and record calls from lead profiles', color: 'text-purple-600 bg-purple-50' }
  ];

  return (
    <div className="max-w-lg space-y-3">
      {integrations.map(ig => (
        <div key={ig.name} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ig.color}`}>
            <ig.icon size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{ig.name}</p>
            <p className="text-xs text-gray-500">{ig.desc}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ig.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {ig.status === 'connected' ? 'Connected' : 'Configure'}
          </span>
        </div>
      ))}
      <p className="text-xs text-gray-400 mt-4 px-1">
        Integration credentials are managed via environment variables. Contact your administrator to add or modify integrations.
      </p>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('profile');

  const tabs = [
    { key: 'profile', label: 'Profile', icon: FiUser },
    { key: 'billing', label: 'Billing & Plans', icon: FiCreditCard },
    { key: 'integrations', label: 'Integrations', icon: FiZap },
    { key: 'security', label: 'Security', icon: FiLock }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="flex gap-8">
        <nav className="w-44 flex-shrink-0 space-y-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === t.key ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'billing' && <BillingTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'security' && (
            <div className="max-w-lg bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Security Settings</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Session timeout</p>
                    <p className="text-xs text-gray-500">Sessions expire after 7 days of inactivity</p>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">7 days</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Password strength</p>
                    <p className="text-xs text-gray-500">Minimum 8 characters required</p>
                  </div>
                  <FiCheck size={16} className="text-green-500" />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">API rate limiting</p>
                    <p className="text-xs text-gray-500">100 requests per 15 minutes per IP</p>
                  </div>
                  <FiCheck size={16} className="text-green-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
