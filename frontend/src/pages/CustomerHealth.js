import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent,
  Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, LinearProgress, Tabs, Tab, Alert, IconButton,
  List, ListItem, ListItemText, Tooltip, Select, MenuItem,
  FormControl, InputLabel
} from '@mui/material';
import {
  FiHeart, FiTrendingUp, FiTrendingDown, FiAlertTriangle,
  FiDollarSign, FiTarget, FiActivity, FiZap, FiRefreshCw,
  FiThumbsUp, FiThumbsDown, FiEye, FiBarChart2
} from 'react-icons/fi';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts';

const CustomerHealth = () => {
  const [healthRecords, setHealthRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [atRiskCustomers, setAtRiskCustomers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';

      const [recordsRes, analyticsRes, atRiskRes, opportunitiesRes, trendsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/customer-health${params}`, config),
        axios.get(`${API_BASE_URL}/customer-health/analytics/overview`, config),
        axios.get(`${API_BASE_URL}/customer-health/at-risk`, config),
        axios.get(`${API_BASE_URL}/customer-health/opportunities`, config),
        axios.get(`${API_BASE_URL}/customer-health/analytics/trends?days=30`, config)
      ]);

      setHealthRecords(recordsRes.data);
      setAnalytics(analyticsRes.data);
      setAtRiskCustomers(atRiskRes.data);
      setOpportunities(opportunitiesRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status) => {
    const colors = {
      excellent: '#2e7d32',
      healthy: '#66bb6a',
      stable: '#ffa726',
      at_risk: '#f57c00',
      critical: '#d32f2f'
    };
    return colors[status] || '#757575';
  };

  const getHealthIcon = (status) => {
    const icons = {
      excellent: '🌟',
      healthy: '💚',
      stable: '⚠️',
      at_risk: '🔴',
      critical: '🚨'
    };
    return icons[status] || '❓';
  };

  const getTrendIcon = (direction) => {
    const icons = {
      improving: <FiTrendingUp style={{ color: '#2e7d32' }} />,
      stable: <FiActivity style={{ color: '#757575' }} />,
      declining: <FiTrendingDown style={{ color: '#f57c00' }} />,
      critical_decline: <FiAlertTriangle style={{ color: '#d32f2f' }} />
    };
    return icons[direction] || <FiActivity />;
  };

  const COLORS = ['#2e7d32', '#66bb6a', '#ffa726', '#f57c00', '#d32f2f'];

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }} align="center">Loading Customer Health Data...</Typography>
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
              ❤️ Customer Health Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive health monitoring with predictive analytics
            </Typography>
          </Box>
          <Box>
            <FormControl size="small" sx={{ minWidth: 150, mr: 1 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Filter by Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="excellent">Excellent</MenuItem>
                <MenuItem value="healthy">Healthy</MenuItem>
                <MenuItem value="stable">Stable</MenuItem>
                <MenuItem value="at_risk">At Risk</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<FiRefreshCw />}
              onClick={fetchData}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Analytics Overview */}
        {analytics && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiHeart style={{ marginRight: 8, color: '#1976d2' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Customers
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalCustomers}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Average score: {analytics.averageScore}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiAlertTriangle style={{ marginRight: 8, color: '#d32f2f' }} />
                    <Typography color="text.secondary" variant="body2">
                      At Risk
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="error">
                    {analytics.atRiskCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.totalRisks} total risks identified
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiTarget style={{ marginRight: 8, color: '#2e7d32' }} />
                    <Typography color="text.secondary" variant="body2">
                      Opportunities
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {analytics.opportunityCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.totalOpportunities} identified
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiTrendingUp style={{ marginRight: 8, color: '#66bb6a' }} />
                    <Typography color="text.secondary" variant="body2">
                      Improving
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {analytics.trends.improving}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.trends.declining} declining
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Health Status Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Health Status Distribution
              </Typography>
              {analytics && (
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Excellent', value: analytics.byStatus.excellent },
                        { name: 'Healthy', value: analytics.byStatus.healthy },
                        { name: 'Stable', value: analytics.byStatus.stable },
                        { name: 'At Risk', value: analytics.byStatus.at_risk },
                        { name: 'Critical', value: analytics.byStatus.critical }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Churn Risk Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Churn Risk Distribution
              </Typography>
              {analytics && (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart
                    data={[
                      { name: 'Low Risk', value: analytics.churnPrediction.low },
                      { name: 'Medium Risk', value: analytics.churnPrediction.medium },
                      { name: 'High Risk', value: analytics.churnPrediction.high }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Health Trends Over Time */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Average Health Score Trend (Last 30 Days)
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Avg Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs Section */}
        <Paper sx={{ p: 3 }}>
          <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 3 }}>
            <Tab label="All Customers" />
            <Tab label={`At Risk (${atRiskCustomers.length})`} />
            <Tab label={`Opportunities (${opportunities.length})`} />
          </Tabs>

          {selectedTab === 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Trend</TableCell>
                  <TableCell>Churn Risk</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {healthRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No customer health records found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  healthRecords.map((record) => (
                    <TableRow key={record._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {record.entityType} - {record.entityId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={record.overallScore}
                              sx={{
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getHealthColor(record.healthStatus)
                                }
                              }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight="bold">
                            {record.overallScore}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{getHealthIcon(record.healthStatus)}</span>
                          <Chip
                            label={record.healthStatus}
                            size="small"
                            sx={{
                              bgcolor: getHealthColor(record.healthStatus),
                              color: 'white'
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {record.trend && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getTrendIcon(record.trend.direction)}
                            <Typography variant="caption">
                              {record.trend.changePercent > 0 ? '+' : ''}
                              {record.trend.changePercent?.toFixed(1)}%
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.predictions?.churnRisk && (
                          <Chip
                            label={`${record.predictions.churnRisk.probability}%`}
                            size="small"
                            color={
                              record.predictions.churnRisk.probability > 60 ? 'error' :
                              record.predictions.churnRisk.probability > 30 ? 'warning' : 'success'
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailsModal(true);
                            }}
                          >
                            <FiEye />
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
            <Box>
              {atRiskCustomers.length === 0 ? (
                <Alert severity="success">
                  🎉 Great news! No customers are currently at risk of churning.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {atRiskCustomers.map((record) => (
                    <Grid item xs={12} md={6} key={record._id}>
                      <Card sx={{ border: `2px solid ${getHealthColor(record.healthStatus)}` }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justify: 'space-between', alignItems: 'start', mb: 2 }}>
                            <Box>
                              <Typography variant="h6">
                                {getHealthIcon(record.healthStatus)} {record.entityType}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {record.entityId}
                              </Typography>
                            </Box>
                            <Chip
                              label={`Score: ${record.overallScore}`}
                              color="error"
                            />
                          </Box>

                          {record.predictions?.churnRisk && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Churn Risk: {record.predictions.churnRisk.probability}%
                              </Typography>
                              <Typography variant="caption">
                                Confidence: {record.predictions.churnRisk.confidence}%
                              </Typography>
                            </Alert>
                          )}

                          {record.risks && record.risks.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Risk Factors:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {record.risks.slice(0, 3).map((risk, idx) => (
                                  <Chip
                                    key={idx}
                                    label={risk.type.replace(/_/g, ' ')}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {record.nextBestActions && record.nextBestActions.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                Recommended Actions:
                              </Typography>
                              <List dense>
                                {record.nextBestActions.slice(0, 2).map((action, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemText
                                      primary={action.action}
                                      secondary={`Priority: ${action.priority}`}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}

                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<FiEye />}
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailsModal(true);
                            }}
                            sx={{ mt: 2 }}
                          >
                            View Full Details
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {selectedTab === 2 && (
            <Box>
              {opportunities.length === 0 ? (
                <Alert severity="info">
                  No expansion opportunities identified at the moment.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {opportunities.map((record) => (
                    <Grid item xs={12} md={6} key={record._id}>
                      <Card sx={{ border: '2px solid #2e7d32' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justify: 'space-between', alignItems: 'start', mb: 2 }}>
                            <Box>
                              <Typography variant="h6">
                                💚 {record.entityType}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {record.entityId}
                              </Typography>
                            </Box>
                            <Chip
                              label={`Score: ${record.overallScore}`}
                              color="success"
                            />
                          </Box>

                          {record.predictions?.expansionLikelihood && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                              <Typography variant="body2" fontWeight="bold">
                                Expansion Likelihood: {record.predictions.expansionLikelihood.probability}%
                              </Typography>
                              <Typography variant="caption">
                                Estimated Value: ${record.predictions.expansionLikelihood.estimatedValue}
                              </Typography>
                            </Alert>
                          )}

                          {record.opportunities && record.opportunities.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Opportunities:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {record.opportunities.map((opp, idx) => (
                                  <Chip
                                    key={idx}
                                    label={opp.type}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}

                          <Button
                            fullWidth
                            variant="outlined"
                            color="success"
                            startIcon={<FiDollarSign />}
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailsModal(true);
                            }}
                            sx={{ mt: 2 }}
                          >
                            View Opportunity Details
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Paper>

        {/* Details Modal */}
        <Dialog
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedRecord && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 32 }}>{getHealthIcon(selectedRecord.healthStatus)}</span>
                  <Box>
                    <Typography variant="h6">Customer Health Details</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedRecord.entityType} - {selectedRecord.entityId}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">{selectedRecord.overallScore}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Overall Score
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {selectedRecord.predictions?.churnRisk?.probability || 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Churn Risk
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {selectedRecord.predictions?.expansionLikelihood?.probability || 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expansion Likelihood
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {selectedRecord.scores && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Component Scores
                    </Typography>
                    {Object.entries(selectedRecord.scores).map(([component, data]) => (
                      <Box key={component} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">
                            {component.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {data.score}/100
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={data.score || 0} />
                      </Box>
                    ))}
                  </Box>
                )}

                {selectedRecord.nextBestActions && selectedRecord.nextBestActions.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recommended Next Actions
                    </Typography>
                    <List>
                      {selectedRecord.nextBestActions.map((action, idx) => (
                        <ListItem key={idx}>
                          <ListItemText
                            primary={action.action}
                            secondary={
                              <>
                                <Typography component="span" variant="caption" display="block">
                                  Priority: {action.priority} | Category: {action.category}
                                </Typography>
                                <Typography component="span" variant="caption" display="block">
                                  {action.reasoning}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Container>
  );
};

export default CustomerHealth;
