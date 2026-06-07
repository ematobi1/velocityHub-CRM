import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent,
  Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, IconButton, LinearProgress, Tabs, Tab,
  Select, MenuItem, FormControl, Alert, Tooltip,
  List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import toast from 'react-hot-toast';
import {
  FiActivity, FiPlay, FiPause, FiTrash2, FiSettings,
  FiTrendingUp, FiCheckCircle, FiXCircle,
  FiZap, FiTarget, FiUser
} from 'react-icons/fi';
import axios from 'axios';

const AIAgents = () => {
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [createdAgent, setCreatedAgent] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [agentsRes, templatesRes, suggestionsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/ai-agents`, config),
        axios.get(`${API_BASE_URL}/ai-agents/templates`, config),
        axios.get(`${API_BASE_URL}/ai-agents/suggestions/pending`, config),
        axios.get(`${API_BASE_URL}/ai-agents/analytics/overview`, config)
      ]);

      setAgents(agentsRes.data || []);
      setTemplates(templatesRes.data || []);
      setSuggestions(suggestionsRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set defaults on error to prevent crashes
      setAgents([]);
      setTemplates([]);
      setSuggestions([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAgent = async (template) => {
    try {
      setCreatingAgent(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/ai-agents/create-from-template`,
        { templateName: template.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCreatedAgent(response.data);
      setSuccess(`${template.displayName} created successfully!`);
      setShowCreateModal(false);
      setShowSuccessModal(true);
      await fetchData();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error creating agent:', error);
      setError(error.response?.data?.error || 'Failed to create agent. Please try again.');
    } finally {
      setCreatingAgent(false);
    }
  };

  const handleUpdateStatus = async (agentId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/ai-agents/${agentId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdateAutonomy = async (agentId, autonomyLevel) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/ai-agents/${agentId}/autonomy`,
        { autonomyLevel },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
    } catch (error) {
      console.error('Error updating autonomy:', error);
    }
  };

  const handleRespondToAction = async (agentId, actionIndex, response) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/ai-agents/${agentId}/actions/${actionIndex}/respond`,
        { response },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
    } catch (error) {
      console.error('Error responding to action:', error);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/ai-agents/${agentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchData();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleRunCycle = async (agentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/ai-agents/${agentId}/run-cycle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Agent cycle started! Check back in a few moments for results.');
    } catch (error) {
      console.error('Error running cycle:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      paused: 'warning',
      training: 'info',
      inactive: 'default'
    };
    return colors[status] || 'default';
  };

  const getAutonomyColor = (level) => {
    const colors = {
      suggest_only: 'info',
      act_with_approval: 'warning',
      fully_autonomous: 'error'
    };
    return colors[level] || 'default';
  };

  const getAgentIcon = (type) => {
    const icons = {
      deal_coach: '🎯',
      churn_prevention: '🛡️',
      lead_conversion: '🚀',
      support_assistant: '🤖',
      customer_success: '⭐',
      renewal_specialist: '🔄',
      cross_sell_advisor: '💰',
      account_health_monitor: '❤️',
      pipeline_optimizer: '📊'
    };
    return icons[type] || '🤖';
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }} align="center">Loading AI Agents...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              🤖 AI Agents
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Autonomous AI agents that monitor, learn, and act on your behalf
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FiActivity />}
              onClick={() => setShowSuggestionsModal(true)}
              sx={{ mr: 1 }}
            >
              Pending Actions ({suggestions.reduce((sum, s) => sum + (s.actions?.length || 0), 0)})
            </Button>
            <Button
              variant="contained"
              startIcon={<FiZap />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Agent
            </Button>
          </Box>
        </Box>

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Analytics Overview */}
        {analytics && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiUser style={{ marginRight: 8, color: '#1976d2' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Agents
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalAgents}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.activeAgents} active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiActivity style={{ marginRight: 8, color: '#2e7d32' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Actions
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalActions}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.successfulActions} successful
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiTrendingUp style={{ marginRight: 8, color: '#ed6c02' }} />
                    <Typography color="text.secondary" variant="body2">
                      Success Rate
                    </Typography>
                  </Box>
                  <Typography variant="h4">{Math.round(analytics.averageSuccessRate)}%</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.averageSuccessRate}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiTarget style={{ marginRight: 8, color: '#9c27b0' }} />
                    <Typography color="text.secondary" variant="body2">
                      Impact Score
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalImpactScore}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all agents
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Agents List */}
        <Paper sx={{ p: 3 }}>
          <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
            <Tab label="All Agents" />
            <Tab label="Active" />
            <Tab label="Performance" />
          </Tabs>

          {selectedTab === 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Autonomy</TableCell>
                  <TableCell>Performance</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No agents yet. Create your first AI agent to get started!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 24, marginRight: 8 }}>
                            {getAgentIcon(agent.type)}
                          </span>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {agent.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {agent.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={agent.type.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={agent.status}
                          size="small"
                          color={getStatusColor(agent.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select
                            value={agent.autonomyLevel}
                            onChange={(e) => handleUpdateAutonomy(agent._id, e.target.value)}
                          >
                            <MenuItem value="suggest_only">Suggest Only</MenuItem>
                            <MenuItem value="act_with_approval">Act with Approval</MenuItem>
                            <MenuItem value="fully_autonomous">Fully Autonomous</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="caption">
                            {agent.performanceMetrics.totalActions} actions
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={agent.performanceMetrics.successRate || 0}
                            sx={{ mt: 0.5 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(agent.performanceMetrics.successRate || 0)}% success
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowDetailsModal(true);
                            }}
                          >
                            <FiSettings />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={agent.status === 'active' ? 'Pause' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleUpdateStatus(
                                agent._id,
                                agent.status === 'active' ? 'paused' : 'active'
                              )
                            }
                          >
                            {agent.status === 'active' ? <FiPause /> : <FiPlay />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Run Monitoring Cycle">
                          <IconButton
                            size="small"
                            onClick={() => handleRunCycle(agent._id)}
                          >
                            <FiActivity />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAgent(agent._id)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {selectedTab === 1 && (
            <Grid container spacing={3}>
              {agents.filter(a => a.status === 'active').map((agent) => (
                <Grid size={{ xs: 12, md: 6 }} key={agent._id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 32, marginRight: 12 }}>
                            {getAgentIcon(agent.type)}
                          </span>
                          <Box>
                            <Typography variant="h6">{agent.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {agent.description}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={agent.status}
                          size="small"
                          color="success"
                        />
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Recent Activity
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption">
                            {agent.performanceMetrics.totalActions} actions
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            {agent.performanceMetrics.successfulActions} successful
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={agent.performanceMetrics.successRate || 0}
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FiSettings />}
                          onClick={() => {
                            setSelectedAgent(agent);
                            setShowDetailsModal(true);
                          }}
                        >
                          Details
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FiActivity />}
                          onClick={() => handleRunCycle(agent._id)}
                        >
                          Run Now
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {agents.filter(a => a.status === 'active').length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info">
                    No active agents. Activate an agent to see it here.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}

          {selectedTab === 2 && analytics && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Performance by Agent Type
              </Typography>
              {analytics.byType && Object.keys(analytics.byType).length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Agent Type</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell>Total Actions</TableCell>
                    <TableCell>Avg Success Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(analytics.byType).map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 20, marginRight: 8 }}>
                            {getAgentIcon(type)}
                          </span>
                          {type.replace(/_/g, ' ')}
                        </Box>
                      </TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell>{data.actions}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={data.successRate}
                            sx={{ width: 100 }}
                          />
                          <Typography variant="caption">
                            {Math.round(data.successRate)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              ) : (
                <Alert severity="info">
                  No agent performance data available yet. Create and activate agents to see performance metrics.
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        {/* Create Agent Modal */}
        <Dialog
          open={showCreateModal}
          onClose={() => !creatingAgent && setShowCreateModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box>
              <Typography variant="h5">Create AI Agent from Template</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Choose a pre-configured agent template to get started quickly
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {templates.map((template) => (
                <Grid size={{ xs: 12, sm: 6 }} key={template.name}>
                  <Card
                    sx={{
                      cursor: creatingAgent ? 'not-allowed' : 'pointer',
                      height: '100%',
                      border: '2px solid transparent',
                      transition: 'all 0.2s',
                      '&:hover': creatingAgent ? {} : {
                        boxShadow: 6,
                        border: '2px solid #1976d2',
                        transform: 'translateY(-4px)'
                      }
                    }}
                    onClick={() => !creatingAgent && handleCreateAgent(template)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                        <Box
                          sx={{
                            fontSize: 48,
                            marginRight: 2,
                            lineHeight: 1
                          }}
                        >
                          {template.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            {template.displayName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {template.description}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={template.autonomyLevel.replace(/_/g, ' ')}
                            size="small"
                            color={getAutonomyColor(template.autonomyLevel)}
                            sx={{ fontWeight: 500 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={`${template.estimatedImpact} impact`}
                            size="small"
                            color={
                              template.estimatedImpact === 'critical' ? 'error' :
                              template.estimatedImpact === 'high' ? 'warning' : 'info'
                            }
                            sx={{ fontWeight: 500 }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {creatingAgent && (
              <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <LinearProgress sx={{ width: 200 }} />
                <Typography variant="body2" color="text.secondary">
                  Creating agent...
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateModal(false)} disabled={creatingAgent}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Agent Details Modal */}
        <Dialog
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedAgent && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 32 }}>{getAgentIcon(selectedAgent.type)}</span>
                  <Box>
                    <Typography variant="h6">{selectedAgent.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedAgent.description}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status & Configuration
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={selectedAgent.status}
                      size="small"
                      color={getStatusColor(selectedAgent.status)}
                    />
                    <Chip
                      label={selectedAgent.autonomyLevel.replace(/_/g, ' ')}
                      size="small"
                      color={getAutonomyColor(selectedAgent.autonomyLevel)}
                    />
                    <Chip
                      label={selectedAgent.learningMode}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Performance Metrics
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 4 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4">
                          {selectedAgent.performanceMetrics.totalActions}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Actions
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4">
                          {Math.round(selectedAgent.performanceMetrics.successRate || 0)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Success Rate
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4">
                          {selectedAgent.performanceMetrics.impactScore}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Impact Score
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Capabilities
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {selectedAgent.capabilities.map((cap, idx) => (
                      <Chip
                        key={idx}
                        label={cap.action.replace(/_/g, ' ')}
                        size="small"
                        color={cap.enabled ? 'primary' : 'default'}
                        variant={cap.enabled ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Actions
                  </Typography>
                  <List>
                    {selectedAgent.recentActions.slice(0, 5).map((action, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={action.suggestion}
                          secondary={`${action.actionType} • ${action.outcome}`}
                        />
                        <Chip
                          label={action.outcome}
                          size="small"
                          color={
                            action.outcome === 'executed' ? 'success' :
                            action.outcome === 'pending' ? 'warning' :
                            action.outcome === 'rejected' ? 'error' : 'default'
                          }
                        />
                      </ListItem>
                    ))}
                    {selectedAgent.recentActions.length === 0 && (
                      <ListItem>
                        <ListItemText
                          secondary="No recent actions"
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button
                  variant="outlined"
                  startIcon={<FiActivity />}
                  onClick={() => {
                    handleRunCycle(selectedAgent._id);
                    setShowDetailsModal(false);
                  }}
                >
                  Run Cycle
                </Button>
                <Button onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Success Modal */}
        <Dialog
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: 64, mb: 2 }}>✅</Box>
              <Typography variant="h5">Agent Created Successfully!</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {createdAgent && (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  <span style={{ fontSize: 48, marginRight: 16 }}>
                    {getAgentIcon(createdAgent.type)}
                  </span>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="h6">{createdAgent.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {createdAgent.description}
                    </Typography>
                  </Box>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Your agent is now <strong>{createdAgent.status}</strong> and will start monitoring automatically.
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    label={createdAgent.autonomyLevel.replace(/_/g, ' ')}
                    color={getAutonomyColor(createdAgent.autonomyLevel)}
                  />
                  <Chip
                    label={createdAgent.status}
                    color={getStatusColor(createdAgent.status)}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  The agent will analyze your CRM data and start making intelligent suggestions based on its capabilities.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => {
                setShowSuccessModal(false);
                if (createdAgent) {
                  setSelectedAgent(createdAgent);
                  setShowDetailsModal(true);
                }
              }}
            >
              View Details
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowSuccessModal(false)}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Pending Suggestions Modal */}
        <Dialog
          open={showSuggestionsModal}
          onClose={() => setShowSuggestionsModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Pending Agent Actions</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Review and approve/reject actions suggested by your AI agents
            </Typography>

            {suggestions.length === 0 ? (
              <Alert severity="info">
                No pending actions at the moment. Your agents are monitoring and will suggest actions when needed.
              </Alert>
            ) : (
              suggestions.map((suggestion) => (
                <Box key={suggestion.agentId} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {getAgentIcon(suggestion.type)} {suggestion.agentName}
                  </Typography>
                  <List>
                    {suggestion.actions.map((action, idx) => (
                      <ListItem key={idx} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                        <ListItemText
                          primary={action.suggestion}
                          secondary={
                            <>
                              <Typography component="span" variant="caption" display="block">
                                Type: {action.actionType}
                              </Typography>
                              <Typography component="span" variant="caption" display="block">
                                Entity: {action.entityType}
                              </Typography>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            color="success"
                            onClick={() => handleRespondToAction(suggestion.agentId, idx, 'approve')}
                            sx={{ mr: 1 }}
                          >
                            <FiCheckCircle />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleRespondToAction(suggestion.agentId, idx, 'reject')}
                          >
                            <FiXCircle />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSuggestionsModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default AIAgents;
