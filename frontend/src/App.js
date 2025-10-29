import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Companies from './pages/Companies';
import Analytics from './pages/Analytics';
import CustomerService from './pages/CustomerService';
import ConversationIntelligence from './pages/ConversationIntelligence';
import Workflows from './pages/Workflows';
import SocialMedia from './pages/SocialMedia';
import LeadEnrichment from './pages/LeadEnrichment';
import AIAgents from './pages/AIAgents';
import CustomerHealth from './pages/CustomerHealth';
import RelationshipMap from './pages/RelationshipMap';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="companies" element={<Companies />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="conversation-intelligence" element={<ConversationIntelligence />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="social-media" element={<SocialMedia />} />
          <Route path="lead-enrichment" element={<LeadEnrichment />} />
          <Route path="ai-agents" element={<AIAgents />} />
          <Route path="customer-health" element={<CustomerHealth />} />
          <Route path="relationship-map" element={<RelationshipMap />} />
          <Route path="customer-service" element={<CustomerService />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
