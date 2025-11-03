import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Button, Grid, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, List, ListItem, ListItemText, IconButton, Tooltip,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Alert
} from '@mui/material';
import {
  FiGlobe, FiUsers, FiLink, FiPlusCircle,
  FiTarget, FiRefreshCw, FiEye, FiAward, FiTrash2, FiEdit
} from 'react-icons/fi';
import axios from 'axios';

const RelationshipMap = () => {
  const [graphs, setGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [showEditNodeModal, setShowEditNodeModal] = useState(false);
  const [showPathFinderModal, setShowPathFinderModal] = useState(false);
  const [showImportContactsModal, setShowImportContactsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Form states
  const [newGraphForm, setNewGraphForm] = useState({ account: '' });
  const [newNodeForm, setNewNodeForm] = useState({
    name: '',
    title: '',
    company: '',
    type: 'contact',
    attributes: {
      role: '',
      seniority: '',
      decisionMaker: false,
      champion: false,
      influencer: false,
      blocker: false
    }
  });
  const [newEdgeForm, setNewEdgeForm] = useState({
    source: '',
    target: '',
    type: 'works_with',
    strength: 50,
    frequency: 50,
    bidirectional: false
  });
  const [editNodeForm, setEditNodeForm] = useState(null);
  const [paths, setPaths] = useState([]);
  const [selectedTargetNode, setSelectedTargetNode] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [graphsRes, analyticsRes, companiesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/relationship-graph`, config),
        axios.get(`${API_BASE_URL}/relationship-graph/analytics/overview`, config),
        axios.get(`${API_BASE_URL}/companies?limit=100`, config)
      ]);

      setGraphs(graphsRes.data);
      setAnalytics(analyticsRes.data);
      setCompanies(companiesRes.data.companies || companiesRes.data);

      if (graphsRes.data.length > 0) {
        setSelectedGraph(graphsRes.data[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateGraph = async () => {
    try {
      if (!newGraphForm.account) {
        setError('Please select a company');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/relationship-graph`,
        { account: newGraphForm.account, nodes: [], edges: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGraphs([response.data, ...graphs]);
      setSelectedGraph(response.data);
      setSuccess('Graph created successfully!');
      setShowGraphModal(false);
      setNewGraphForm({ account: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating graph:', error);
      setError(error.response?.data?.error || 'Failed to create graph');
    } finally {
    }
  };

  const handleAddNode = async () => {
    try {
      if (!selectedGraph || !selectedGraph._id) {
        setError('Please select a graph first');
        return;
      }

      if (!newNodeForm.name || !newNodeForm.title) {
        setError('Name and title are required');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/relationship-graph/${selectedGraph._id}/node`,
        newNodeForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedGraph(response.data.graph);
      setSuccess('Node added successfully!');
      setShowAddNodeModal(false);
      setNewNodeForm({
        name: '',
        title: '',
        company: '',
        type: 'contact',
        attributes: {
          role: '',
          seniority: '',
          decisionMaker: false,
          champion: false,
          influencer: false,
          blocker: false
        }
      });
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding node:', error);
      setError(error.response?.data?.error || 'Failed to add node');
    } finally {
    }
  };

  const handleAddEdge = async () => {
    try {
      if (!selectedGraph || !selectedGraph._id) {
        setError('Please select a graph first');
        return;
      }

      if (!newEdgeForm.source || !newEdgeForm.target) {
        setError('Source and target nodes are required');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/relationship-graph/${selectedGraph._id}/edge`,
        newEdgeForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedGraph(response.data);
      setSuccess('Relationship added successfully!');
      setShowAddEdgeModal(false);
      setNewEdgeForm({
        source: '',
        target: '',
        type: 'works_with',
        strength: 50,
        frequency: 50,
        bidirectional: false
      });
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding edge:', error);
      setError(error.response?.data?.error || 'Failed to add relationship');
    } finally {
    }
  };

  const handleUpdateNode = async () => {
    try {
      if (!selectedGraph || !editNodeForm) {
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/relationship-graph/${selectedGraph._id}/node/${editNodeForm.id}`,
        editNodeForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedGraph(response.data);
      setSuccess('Node updated successfully!');
      setShowEditNodeModal(false);
      setEditNodeForm(null);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating node:', error);
      setError(error.response?.data?.error || 'Failed to update node');
    } finally {
    }
  };

  const handleDeleteNode = async (nodeId) => {
    try {
      if (!selectedGraph) {
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE_URL}/relationship-graph/${selectedGraph._id}/node/${nodeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedGraph(response.data);
      setSuccess('Node deleted successfully!');
      setShowDeleteConfirmModal(false);
      setDeleteTarget(null);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting node:', error);
      setError(error.response?.data?.error || 'Failed to delete node');
    } finally {
    }
  };

  const handleDeleteGraph = async (graphId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/relationship-graph/${graphId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGraphs(graphs.filter(g => g._id !== graphId));
      if (selectedGraph && selectedGraph._id === graphId) {
        setSelectedGraph(graphs.find(g => g._id !== graphId) || null);
      }
      setSuccess('Graph deleted successfully!');
      setShowDeleteConfirmModal(false);
      setDeleteTarget(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting graph:', error);
      setError(error.response?.data?.error || 'Failed to delete graph');
    } finally {
    }
  };

  const handleFindPaths = async (targetNodeId) => {
    try {
      if (!selectedGraph) {
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/relationship-graph/${selectedGraph._id}/paths/${targetNodeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPaths(response.data);
      setSelectedTargetNode(targetNodeId);
      setShowPathFinderModal(true);
    } catch (error) {
      console.error('Error finding paths:', error);
      setError(error.response?.data?.error || 'Failed to find paths');
    } finally {
    }
  };

  const handleImportContacts = async (companyId) => {
    try {
      if (!selectedGraph) {
        setError('Please select a graph first');
        return;
      }

      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch company with contacts
      const companyResponse = await axios.get(`${API_BASE_URL}/companies/${companyId}`, config);
      const company = companyResponse.data;

      if (!company.contacts || company.contacts.length === 0) {
        setError('No contacts found for this company');
          return;
      }

      // Add each contact as a node
      let addedCount = 0;
      for (const contact of company.contacts) {
        try {
          await axios.post(
            `${API_BASE_URL}/relationship-graph/${selectedGraph._id}/node`,
            {
              type: 'contact',
              entityId: contact._id,
              name: `${contact.firstName} ${contact.lastName}`,
              title: contact.jobTitle || 'Contact',
              company: company.name,
              attributes: {
                role: contact.department || '',
                seniority: '',
                decisionMaker: false,
                champion: false,
                influencer: false,
                blocker: false
              }
            },
            config
          );
          addedCount++;
        } catch (err) {
          console.error('Error adding contact:', err);
        }
      }

      setSuccess(`Imported ${addedCount} contacts successfully!`);
      setShowImportContactsModal(false);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error importing contacts:', error);
      setError(error.response?.data?.error || 'Failed to import contacts');
    } finally {
    }
  };

  const getNodeColor = (node) => {
    if (node.attributes.decisionMaker) return '#d32f2f';
    if (node.attributes.champion) return '#2e7d32';
    if (node.attributes.influencer) return '#1976d2';
    if (node.attributes.blocker) return '#f57c00';
    return '#757575';
  };

  const getNodeIcon = (node) => {
    if (node.attributes.decisionMaker) return '👑';
    if (node.attributes.champion) return '⭐';
    if (node.attributes.influencer) return '💡';
    if (node.attributes.blocker) return '🚧';
    return '👤';
  };

  const getRelationshipIcon = (type) => {
    const icons = {
      reports_to: '⬆️',
      works_with: '🤝',
      referred_by: '👥',
      knows: '💬',
      board_member: '🏛️',
      advisor: '🎓',
      partner: '🤝',
      competitor: '⚔️',
      friend: '❤️',
      mentor: '📚',
      former_colleague: '🔙'
    };
    return icons[type] || '🔗';
  };

  const renderGraphVisualization = () => {
    if (!selectedGraph || !selectedGraph.nodes || selectedGraph.nodes.length === 0) {
      return (
        <Alert severity="info">
          No relationship graph available. This is a mock visualization. Create a graph to see actual data.
        </Alert>
      );
    }

    return (
      <Box sx={{ position: 'relative', height: 400, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
        {/* Simple visualization using absolute positioning */}
        {selectedGraph.nodes.map((node, idx) => {
          const angle = (2 * Math.PI * idx) / selectedGraph.nodes.length;
          const radius = 150;
          const x = 50 + radius * Math.cos(angle) + Math.random() * 20;
          const y = 50 + radius * Math.sin(angle) + Math.random() * 20;

          return (
            <Tooltip key={node.id} title={`${node.name} - ${node.title}`}>
              <Box
                sx={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  '&:hover': { transform: 'translate(-50%, -50%) scale(1.2)' }
                }}
                onClick={() => {
                  setSelectedNode(node);
                  setShowNodeModal(true);
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: getNodeColor(node),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 24,
                    boxShadow: 2,
                    border: '3px solid white'
                  }}
                >
                  {getNodeIcon(node)}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    mt: 0.5,
                    bgcolor: 'white',
                    px: 1,
                    borderRadius: 1,
                    whiteSpace: 'nowrap',
                    boxShadow: 1
                  }}
                >
                  {node.name}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {/* Draw connections (simplified) */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          {selectedGraph.edges?.map((edge, idx) => {
            const sourceNode = selectedGraph.nodes.find(n => n.id === edge.source);
            const targetNode = selectedGraph.nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const sourceIdx = selectedGraph.nodes.indexOf(sourceNode);
            const targetIdx = selectedGraph.nodes.indexOf(targetNode);

            const angle1 = (2 * Math.PI * sourceIdx) / selectedGraph.nodes.length;
            const angle2 = (2 * Math.PI * targetIdx) / selectedGraph.nodes.length;
            const radius = 150;

            const x1 = 50 + radius * Math.cos(angle1);
            const y1 = 50 + radius * Math.sin(angle1);
            const x2 = 50 + radius * Math.cos(angle2);
            const y2 = 50 + radius * Math.sin(angle2);

            return (
              <line
                key={idx}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="#ccc"
                strokeWidth="2"
                opacity={edge.strength / 100}
              />
            );
          })}
        </svg>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              🕸️ Relationship Intelligence
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Graph-based relationship analytics and network visualization
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedGraph && selectedGraph._id && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FiPlusCircle />}
                  onClick={() => setShowAddNodeModal(true)}
                >
                  Add Node
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FiLink />}
                  onClick={() => setShowAddEdgeModal(true)}
                  disabled={!selectedGraph.nodes || selectedGraph.nodes.length < 2}
                >
                  Add Relationship
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FiUsers />}
                  onClick={() => setShowImportContactsModal(true)}
                >
                  Import Contacts
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<FiRefreshCw />}
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<FiPlusCircle />}
              onClick={() => setShowGraphModal(true)}
            >
              Create Graph
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
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiGlobe style={{ marginRight: 8, color: '#1976d2' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Graphs
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalGraphs}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Relationship networks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiUsers style={{ marginRight: 8, color: '#2e7d32' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Nodes
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalNodes}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    People & organizations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiLink style={{ marginRight: 8, color: '#f57c00' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Connections
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalEdges}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Relationships mapped
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FiAward style={{ marginRight: 8, color: '#9c27b0' }} />
                    <Typography color="text.secondary" variant="body2">
                      Key Influencers
                    </Typography>
                  </Box>
                  <Typography variant="h4">{analytics.totalInfluencers}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    High-value connections
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Graph Visualization */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Network Visualization
                </Typography>
                {selectedGraph && (
                  <Box>
                    <Chip
                      label={`${selectedGraph.nodes?.length || 0} nodes`}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`${selectedGraph.edges?.length || 0} connections`}
                      size="small"
                    />
                  </Box>
                )}
              </Box>

              {renderGraphVisualization()}

              {selectedGraph && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Click on nodes to see details. Line thickness represents relationship strength.
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Legend */}
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Legend
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#d32f2f' }} />
                    <Typography variant="caption">Decision Maker</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                    <Typography variant="caption">Champion</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#1976d2' }} />
                    <Typography variant="caption">Influencer</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#f57c00' }} />
                    <Typography variant="caption">Blocker</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            {/* Key Influencers */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                🌟 Key Influencers
              </Typography>
              {selectedGraph && selectedGraph.nodes ? (
                <List dense>
                  {selectedGraph.nodes
                    .filter(n => n.attributes?.influencer || n.attributes?.decisionMaker || n.attributes?.champion)
                    .slice(0, 5)
                    .map((node) => (
                      <ListItem
                        key={node.id}
                        button
                        onClick={() => {
                          setSelectedNode(node);
                          setShowNodeModal(true);
                        }}
                      >
                        <span style={{ fontSize: 20, marginRight: 8 }}>{getNodeIcon(node)}</span>
                        <ListItemText
                          primary={node.name}
                          secondary={`${node.title} • Influence: ${node.influence || node.centrality || 0}`}
                        />
                      </ListItem>
                    ))}
                  {(!selectedGraph.nodes || selectedGraph.nodes.length === 0) && (
                    <ListItem>
                      <ListItemText secondary="No influencers identified yet" />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a graph to view influencers
                </Typography>
              )}
            </Paper>

            {/* Clusters */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                👥 Relationship Clusters
              </Typography>
              {selectedGraph && selectedGraph.analytics?.clusters && selectedGraph.analytics.clusters.length > 0 ? (
                <List dense>
                  {selectedGraph.analytics.clusters.map((cluster, idx) => (
                    <ListItem key={cluster.id}>
                      <ListItemText
                        primary={`Cluster ${idx + 1}`}
                        secondary={`${cluster.members.length} members • Strength: ${Math.round(cluster.strength)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No clusters detected yet
                </Typography>
              )}
            </Paper>

            {/* Insights */}
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                  💡 Insights
                </Typography>
                <IconButton size="small" onClick={() => setShowInsightModal(true)}>
                  <FiEye />
                </IconButton>
              </Box>
              {selectedGraph && selectedGraph.insights && selectedGraph.insights.length > 0 ? (
                <List dense>
                  {selectedGraph.insights.slice(0, 3).map((insight, idx) => (
                    <ListItem key={idx}>
                      <ListItemText
                        primary={insight.type.replace(/_/g, ' ')}
                        secondary={insight.description}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No insights available yet
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Graphs List */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Your Relationship Graphs
          </Typography>
          <Grid container spacing={2}>
            {graphs.length === 0 ? (
              <Grid item xs={12}>
                <Alert severity="info">
                  No relationship graphs yet. Create your first graph to start mapping connections!
                </Alert>
              </Grid>
            ) : (
              graphs.map((graph) => (
                <Grid item xs={12} sm={6} md={4} key={graph._id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedGraph?._id === graph._id ? '2px solid #1976d2' : 'none',
                      '&:hover': { boxShadow: 4 }
                    }}
                    onClick={() => setSelectedGraph(graph)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6">
                          {graph.account?.name || 'Account'}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: 'graph', id: graph._id, name: graph.account?.name || 'Graph' });
                            setShowDeleteConfirmModal(true);
                          }}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={`${graph.analytics?.totalNodes || 0} nodes`}
                          size="small"
                        />
                        <Chip
                          label={`${graph.analytics?.totalEdges || 0} edges`}
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {graph.analytics?.keyInfluencers?.length || 0} key influencers
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Paper>

        {/* Node Details Modal */}
        <Dialog
          open={showNodeModal}
          onClose={() => setShowNodeModal(false)}
          maxWidth="sm"
          fullWidth
        >
          {selectedNode && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 32 }}>{getNodeIcon(selectedNode)}</span>
                  <Box>
                    <Typography variant="h6">{selectedNode.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedNode.title} at {selectedNode.company}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Attributes
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedNode.attributes?.decisionMaker && (
                      <Chip label="Decision Maker" size="small" color="error" />
                    )}
                    {selectedNode.attributes?.champion && (
                      <Chip label="Champion" size="small" color="success" />
                    )}
                    {selectedNode.attributes?.influencer && (
                      <Chip label="Influencer" size="small" color="primary" />
                    )}
                    {selectedNode.attributes?.blocker && (
                      <Chip label="Blocker" size="small" color="warning" />
                    )}
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Network Metrics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Centrality Score"
                        secondary={`${Math.round(selectedNode.centrality || 0)}/100`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Influence Score"
                        secondary={`${Math.round(selectedNode.influence || 0)}/100`}
                      />
                    </ListItem>
                    {selectedNode.attributes?.role && (
                      <ListItem>
                        <ListItemText
                          primary="Role"
                          secondary={selectedNode.attributes.role}
                        />
                      </ListItem>
                    )}
                    {selectedNode.attributes?.seniority && (
                      <ListItem>
                        <ListItemText
                          primary="Seniority"
                          secondary={selectedNode.attributes.seniority}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Connections
                  </Typography>
                  <List dense>
                    {selectedGraph?.edges
                      ?.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                      .slice(0, 5)
                      .map((edge, idx) => {
                        const connectedNodeId = edge.source === selectedNode.id ? edge.target : edge.source;
                        const connectedNode = selectedGraph.nodes.find(n => n.id === connectedNodeId);
                        return (
                          <ListItem key={idx}>
                            <span style={{ marginRight: 8 }}>{getRelationshipIcon(edge.type)}</span>
                            <ListItemText
                              primary={connectedNode?.name || connectedNodeId}
                              secondary={`${edge.type.replace(/_/g, ' ')} • Strength: ${edge.strength}`}
                            />
                          </ListItem>
                        );
                      })}
                  </List>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => handleFindPaths(selectedNode.id)}
                  startIcon={<FiTarget />}
                >
                  Find Paths
                </Button>
                <Button
                  onClick={() => {
                    setEditNodeForm(selectedNode);
                    setShowNodeModal(false);
                    setShowEditNodeModal(true);
                  }}
                  startIcon={<FiEdit />}
                >
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    setDeleteTarget({ type: 'node', id: selectedNode.id, name: selectedNode.name });
                    setShowNodeModal(false);
                    setShowDeleteConfirmModal(true);
                  }}
                  color="error"
                >
                  Delete
                </Button>
                <Button onClick={() => setShowNodeModal(false)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Create Graph Modal */}
        <Dialog
          open={showGraphModal}
          onClose={() => setShowGraphModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create Relationship Graph</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
              Select a company to create a relationship graph. You can then add contacts and map their relationships.
            </Alert>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Company</InputLabel>
              <Select
                value={newGraphForm.account}
                onChange={(e) => setNewGraphForm({ account: e.target.value })}
                label="Select Company"
              >
                {companies.map((company) => (
                  <MenuItem key={company._id} value={company._id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowGraphModal(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateGraph}
              disabled={!newGraphForm.account}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Insights Modal */}
        <Dialog
          open={showInsightModal}
          onClose={() => setShowInsightModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Relationship Insights</DialogTitle>
          <DialogContent>
            {selectedGraph && selectedGraph.insights && selectedGraph.insights.length > 0 ? (
              <List>
                {selectedGraph.insights.map((insight, idx) => (
                  <ListItem key={idx} alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {insight.type.replace(/_/g, ' ')}
                          </Typography>
                          {insight.impact && (
                            <Chip label={insight.impact} size="small" color="warning" />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" display="block">
                            {insight.description}
                          </Typography>
                          {insight.actionRecommended && (
                            <Typography component="span" variant="caption" display="block" sx={{ mt: 1 }}>
                              💡 Recommended: {insight.actionRecommended}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No insights available yet. The system will generate insights as it analyzes your relationship network.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInsightModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Add Node Modal */}
        <Dialog
          open={showAddNodeModal}
          onClose={() => setShowAddNodeModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Node (Person)</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Name"
                value={newNodeForm.name}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Title"
                value={newNodeForm.title}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, title: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Company"
                value={newNodeForm.company}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, company: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newNodeForm.attributes.role}
                  onChange={(e) => setNewNodeForm({
                    ...newNodeForm,
                    attributes: { ...newNodeForm.attributes, role: e.target.value }
                  })}
                  label="Role"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="executive">Executive</MenuItem>
                  <MenuItem value="technical">Technical</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Seniority</InputLabel>
                <Select
                  value={newNodeForm.attributes.seniority}
                  onChange={(e) => setNewNodeForm({
                    ...newNodeForm,
                    attributes: { ...newNodeForm.attributes, seniority: e.target.value }
                  })}
                  label="Seniority"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="c-level">C-Level</MenuItem>
                  <MenuItem value="vp">VP</MenuItem>
                  <MenuItem value="director">Director</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="individual">Individual Contributor</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="Decision Maker"
                  color={newNodeForm.attributes.decisionMaker ? 'error' : 'default'}
                  onClick={() => setNewNodeForm({
                    ...newNodeForm,
                    attributes: { ...newNodeForm.attributes, decisionMaker: !newNodeForm.attributes.decisionMaker }
                  })}
                />
                <Chip
                  label="Champion"
                  color={newNodeForm.attributes.champion ? 'success' : 'default'}
                  onClick={() => setNewNodeForm({
                    ...newNodeForm,
                    attributes: { ...newNodeForm.attributes, champion: !newNodeForm.attributes.champion }
                  })}
                />
                <Chip
                  label="Influencer"
                  color={newNodeForm.attributes.influencer ? 'primary' : 'default'}
                  onClick={() => setNewNodeForm({
                    ...newNodeForm,
                    attributes: { ...newNodeForm.attributes, influencer: !newNodeForm.attributes.influencer }
                  })}
                />
                <Chip
                  label="Blocker"
                  color={newNodeForm.attributes.blocker ? 'warning' : 'default'}
                  onClick={() => setNewNodeForm({
                    ...newNodeForm,
                    attributes: { ...newNodeForm.attributes, blocker: !newNodeForm.attributes.blocker }
                  })}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddNodeModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddNode}>Add Node</Button>
          </DialogActions>
        </Dialog>

        {/* Add Edge Modal */}
        <Dialog
          open={showAddEdgeModal}
          onClose={() => setShowAddEdgeModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Source Node</InputLabel>
                <Select
                  value={newEdgeForm.source}
                  onChange={(e) => setNewEdgeForm({ ...newEdgeForm, source: e.target.value })}
                  label="Source Node"
                >
                  {selectedGraph?.nodes?.map((node) => (
                    <MenuItem key={node.id} value={node.id}>
                      {node.name} - {node.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Target Node</InputLabel>
                <Select
                  value={newEdgeForm.target}
                  onChange={(e) => setNewEdgeForm({ ...newEdgeForm, target: e.target.value })}
                  label="Target Node"
                >
                  {selectedGraph?.nodes?.map((node) => (
                    <MenuItem key={node.id} value={node.id}>
                      {node.name} - {node.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Relationship Type</InputLabel>
                <Select
                  value={newEdgeForm.type}
                  onChange={(e) => setNewEdgeForm({ ...newEdgeForm, type: e.target.value })}
                  label="Relationship Type"
                >
                  <MenuItem value="reports_to">Reports To</MenuItem>
                  <MenuItem value="works_with">Works With</MenuItem>
                  <MenuItem value="referred_by">Referred By</MenuItem>
                  <MenuItem value="knows">Knows</MenuItem>
                  <MenuItem value="board_member">Board Member</MenuItem>
                  <MenuItem value="advisor">Advisor</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                  <MenuItem value="mentor">Mentor</MenuItem>
                  <MenuItem value="former_colleague">Former Colleague</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="caption" gutterBottom>
                  Strength: {newEdgeForm.strength}
                </Typography>
                <Box sx={{ px: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newEdgeForm.strength}
                    onChange={(e) => setNewEdgeForm({ ...newEdgeForm, strength: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" gutterBottom>
                  Frequency: {newEdgeForm.frequency}
                </Typography>
                <Box sx={{ px: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newEdgeForm.frequency}
                    onChange={(e) => setNewEdgeForm({ ...newEdgeForm, frequency: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label="Bidirectional"
                  color={newEdgeForm.bidirectional ? 'primary' : 'default'}
                  onClick={() => setNewEdgeForm({ ...newEdgeForm, bidirectional: !newEdgeForm.bidirectional })}
                />
                <Typography variant="caption" sx={{ ml: 1 }}>
                  (Both parties have mutual relationship)
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddEdgeModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddEdge}>Add Relationship</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Node Modal */}
        <Dialog
          open={showEditNodeModal}
          onClose={() => setShowEditNodeModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Node</DialogTitle>
          <DialogContent>
            {editNodeForm && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Name"
                  value={editNodeForm.name}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, name: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="Title"
                  value={editNodeForm.title}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, title: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="Company"
                  value={editNodeForm.company}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, company: e.target.value })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={editNodeForm.attributes?.role || ''}
                    onChange={(e) => setEditNodeForm({
                      ...editNodeForm,
                      attributes: { ...editNodeForm.attributes, role: e.target.value }
                    })}
                    label="Role"
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="executive">Executive</MenuItem>
                    <MenuItem value="technical">Technical</MenuItem>
                    <MenuItem value="business">Business</MenuItem>
                    <MenuItem value="operations">Operations</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Seniority</InputLabel>
                  <Select
                    value={editNodeForm.attributes?.seniority || ''}
                    onChange={(e) => setEditNodeForm({
                      ...editNodeForm,
                      attributes: { ...editNodeForm.attributes, seniority: e.target.value }
                    })}
                    label="Seniority"
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="c-level">C-Level</MenuItem>
                    <MenuItem value="vp">VP</MenuItem>
                    <MenuItem value="director">Director</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="individual">Individual Contributor</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label="Decision Maker"
                    color={editNodeForm.attributes?.decisionMaker ? 'error' : 'default'}
                    onClick={() => setEditNodeForm({
                      ...editNodeForm,
                      attributes: { ...editNodeForm.attributes, decisionMaker: !editNodeForm.attributes.decisionMaker }
                    })}
                  />
                  <Chip
                    label="Champion"
                    color={editNodeForm.attributes?.champion ? 'success' : 'default'}
                    onClick={() => setEditNodeForm({
                      ...editNodeForm,
                      attributes: { ...editNodeForm.attributes, champion: !editNodeForm.attributes.champion }
                    })}
                  />
                  <Chip
                    label="Influencer"
                    color={editNodeForm.attributes?.influencer ? 'primary' : 'default'}
                    onClick={() => setEditNodeForm({
                      ...editNodeForm,
                      attributes: { ...editNodeForm.attributes, influencer: !editNodeForm.attributes.influencer }
                    })}
                  />
                  <Chip
                    label="Blocker"
                    color={editNodeForm.attributes?.blocker ? 'warning' : 'default'}
                    onClick={() => setEditNodeForm({
                      ...editNodeForm,
                      attributes: { ...editNodeForm.attributes, blocker: !editNodeForm.attributes.blocker }
                    })}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditNodeModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateNode}>Update</Button>
          </DialogActions>
        </Dialog>

        {/* Path Finder Modal */}
        <Dialog
          open={showPathFinderModal}
          onClose={() => setShowPathFinderModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Paths to {selectedGraph?.nodes?.find(n => n.id === selectedTargetNode)?.name || 'Target'}
          </DialogTitle>
          <DialogContent>
            {paths.length > 0 ? (
              <List>
                {paths.map((path, idx) => (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={`Path ${idx + 1} (Length: ${path.length}, Strength: ${Math.round(path.strength * 100)}%)`}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          {path.path.map((nodeId, i) => {
                            const node = selectedGraph?.nodes?.find(n => n.id === nodeId);
                            return (
                              <Box key={i} sx={{ display: 'inline' }}>
                                <Chip
                                  label={node?.name || nodeId}
                                  size="small"
                                  sx={{ mr: 0.5 }}
                                />
                                {i < path.path.length - 1 && ' → '}
                              </Box>
                            );
                          })}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                No paths found to this person. They may be isolated in the network.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPathFinderModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Import Contacts Modal */}
        <Dialog
          open={showImportContactsModal}
          onClose={() => setShowImportContactsModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Import Contacts from Company</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              This will import all contacts from the selected company as nodes in the relationship graph.
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Select Company</InputLabel>
              <Select
                defaultValue=""
                onChange={(e) => {
                  handleImportContacts(e.target.value);
                }}
                label="Select Company"
              >
                {companies.map((company) => (
                  <MenuItem key={company._id} value={company._id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowImportContactsModal(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={showDeleteConfirmModal}
          onClose={() => setShowDeleteConfirmModal(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Are you sure you want to delete {deleteTarget?.type === 'node' ? 'this node' : 'this graph'}?
              <br />
              <strong>{deleteTarget?.name}</strong>
              <br />
              This action cannot be undone.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowDeleteConfirmModal(false);
              setDeleteTarget(null);
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                if (deleteTarget?.type === 'node') {
                  handleDeleteNode(deleteTarget.id);
                } else if (deleteTarget?.type === 'graph') {
                  handleDeleteGraph(deleteTarget.id);
                }
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default RelationshipMap;
