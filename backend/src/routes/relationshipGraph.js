/**
 * Relationship Graph Routes
 * Graph-based relationship intelligence and network analytics
 */

const express = require('express');
const router = express.Router();
const RelationshipGraph = require('../models/RelationshipGraph');
const { auth } = require('../middleware/auth');

/**
 * GET /api/relationship-graph
 * Get all relationship graphs
 */
router.get('/', auth, async (req, res) => {
  try {
    const graphs = await RelationshipGraph.find({})
      .populate('account', 'name industry')
      .sort({ lastUpdated: -1 })
      .limit(50);

    res.json(graphs);
  } catch (error) {
    console.error('Error fetching graphs:', error);
    res.status(500).json({ error: 'Failed to fetch relationship graphs' });
  }
});

/**
 * GET /api/relationship-graph/account/:accountId
 * Get relationship graph for specific account
 */
router.get('/account/:accountId', auth, async (req, res) => {
  try {
    let graph = await RelationshipGraph.findOne({
      account: req.params.accountId
    }).populate('account', 'name industry');

    if (!graph) {
      // Create mock graph for demo
      graph = {
        account: req.params.accountId,
        nodes: [
          {
            id: 'node1',
            type: 'contact',
            name: 'John Smith',
            title: 'CEO',
            company: 'Acme Corp',
            attributes: {
              role: 'executive',
              seniority: 'c-level',
              decisionMaker: true,
              champion: true,
              influencer: true,
              blocker: false
            },
            centrality: 95,
            influence: 98
          },
          {
            id: 'node2',
            type: 'contact',
            name: 'Sarah Johnson',
            title: 'VP Engineering',
            company: 'Acme Corp',
            attributes: {
              role: 'technical',
              seniority: 'vp',
              decisionMaker: true,
              champion: false,
              influencer: true,
              blocker: false
            },
            centrality: 80,
            influence: 85
          },
          {
            id: 'node3',
            type: 'contact',
            name: 'Mike Davis',
            title: 'Engineering Manager',
            company: 'Acme Corp',
            attributes: {
              role: 'technical',
              seniority: 'manager',
              decisionMaker: false,
              champion: true,
              influencer: false,
              blocker: false
            },
            centrality: 60,
            influence: 65
          }
        ],
        edges: [
          {
            source: 'node2',
            target: 'node1',
            type: 'reports_to',
            strength: 95,
            frequency: 85,
            lastInteraction: new Date(),
            source_platform: 'crm',
            bidirectional: false
          },
          {
            source: 'node3',
            target: 'node2',
            type: 'reports_to',
            strength: 90,
            frequency: 90,
            lastInteraction: new Date(),
            source_platform: 'crm',
            bidirectional: false
          },
          {
            source: 'node1',
            target: 'node2',
            type: 'works_with',
            strength: 85,
            frequency: 75,
            lastInteraction: new Date(),
            source_platform: 'email',
            bidirectional: true
          }
        ],
        analytics: {
          totalNodes: 3,
          totalEdges: 3,
          density: 0.67,
          keyInfluencers: ['node1', 'node2'],
          isolatedNodes: [],
          clusters: []
        },
        insights: []
      };
    }

    res.json(graph);
  } catch (error) {
    console.error('Error fetching graph:', error);
    res.status(500).json({ error: 'Failed to fetch relationship graph' });
  }
});

/**
 * POST /api/relationship-graph
 * Create new relationship graph
 */
router.post('/', auth, async (req, res) => {
  try {
    const { account, nodes, edges } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const graph = new RelationshipGraph({
      account,
      nodes: nodes || [],
      edges: edges || [],
      analytics: {
        totalNodes: nodes?.length || 0,
        totalEdges: edges?.length || 0
      }
    });

    // Calculate analytics
    if (graph.nodes.length > 0) {
      graph.calculateCentrality();
      graph.findInfluencers();
      graph.detectClusters();
    }

    await graph.save();

    res.status(201).json(graph);
  } catch (error) {
    console.error('Error creating graph:', error);
    res.status(500).json({ error: 'Failed to create relationship graph' });
  }
});

/**
 * POST /api/relationship-graph/:id/node
 * Add node to relationship graph
 */
router.post('/:id/node', auth, async (req, res) => {
  try {
    const { type, entityId, name, title, company, attributes } = req.body;

    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const nodeId = `node_${Date.now()}`;

    graph.nodes.push({
      id: nodeId,
      type,
      entityId,
      name,
      title,
      company,
      attributes: attributes || {},
      centrality: 0,
      influence: 0
    });

    // Recalculate analytics
    graph.analytics.totalNodes = graph.nodes.length;
    graph.calculateCentrality();
    graph.findInfluencers();

    await graph.save();

    res.json({ graph, nodeId });
  } catch (error) {
    console.error('Error adding node:', error);
    res.status(500).json({ error: 'Failed to add node' });
  }
});

/**
 * POST /api/relationship-graph/:id/edge
 * Add edge (relationship) to graph
 */
router.post('/:id/edge', auth, async (req, res) => {
  try {
    const { source, target, type, strength, frequency, bidirectional } = req.body;

    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Validate nodes exist
    const sourceExists = graph.nodes.some(n => n.id === source);
    const targetExists = graph.nodes.some(n => n.id === target);

    if (!sourceExists || !targetExists) {
      return res.status(400).json({ error: 'Source or target node not found' });
    }

    graph.edges.push({
      source,
      target,
      type,
      strength: strength || 50,
      frequency: frequency || 50,
      lastInteraction: new Date(),
      source_platform: 'crm',
      bidirectional: bidirectional || false
    });

    // Recalculate analytics
    graph.analytics.totalEdges = graph.edges.length;
    graph.calculateCentrality();
    graph.findInfluencers();
    graph.detectClusters();

    await graph.save();

    res.json(graph);
  } catch (error) {
    console.error('Error adding edge:', error);
    res.status(500).json({ error: 'Failed to add edge' });
  }
});

/**
 * GET /api/relationship-graph/:id/influencers
 * Get key influencers in the network
 */
router.get('/:id/influencers', auth, async (req, res) => {
  try {
    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const influencers = graph.nodes
      .filter(n => graph.analytics.keyInfluencers.includes(n.id))
      .sort((a, b) => (b.influence || b.centrality) - (a.influence || a.centrality));

    res.json(influencers);
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({ error: 'Failed to fetch influencers' });
  }
});

/**
 * GET /api/relationship-graph/:id/paths/:targetNodeId
 * Find paths to a target node (e.g., decision maker)
 */
router.get('/:id/paths/:targetNodeId', auth, async (req, res) => {
  try {
    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const targetNode = graph.nodes.find(n => n.id === req.params.targetNodeId);

    if (!targetNode) {
      return res.status(404).json({ error: 'Target node not found' });
    }

    // Simple BFS to find paths
    const paths = [];
    const visited = new Set();

    const findPaths = (currentId, target, path, strength) => {
      if (currentId === target) {
        paths.push({
          path: [...path, currentId],
          strength,
          length: path.length + 1
        });
        return;
      }

      if (path.length > 5) return; // Max depth

      visited.add(currentId);

      const connections = graph.edges.filter(
        e => e.source === currentId || (e.bidirectional && e.target === currentId)
      );

      connections.forEach(edge => {
        const nextId = edge.source === currentId ? edge.target : edge.source;
        if (!visited.has(nextId)) {
          findPaths(nextId, target, [...path, currentId], strength * (edge.strength / 100));
        }
      });

      visited.delete(currentId);
    };

    // Find paths from all nodes
    graph.nodes.forEach(node => {
      if (node.id !== req.params.targetNodeId) {
        visited.clear();
        findPaths(node.id, req.params.targetNodeId, [], 1);
      }
    });

    // Sort by strength
    paths.sort((a, b) => b.strength - a.strength);

    res.json(paths.slice(0, 10)); // Return top 10 paths
  } catch (error) {
    console.error('Error finding paths:', error);
    res.status(500).json({ error: 'Failed to find paths' });
  }
});

/**
 * GET /api/relationship-graph/:id/clusters
 * Get relationship clusters
 */
router.get('/:id/clusters', auth, async (req, res) => {
  try {
    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Recalculate clusters if needed
    if (!graph.analytics.clusters || graph.analytics.clusters.length === 0) {
      graph.detectClusters();
      await graph.save();
    }

    res.json(graph.analytics.clusters);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

/**
 * POST /api/relationship-graph/:id/insight
 * Add insight to graph
 */
router.post('/:id/insight', auth, async (req, res) => {
  try {
    const { type, description, nodes, impact, actionRecommended } = req.body;

    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    graph.insights.push({
      type,
      description,
      nodes: nodes || [],
      impact,
      actionRecommended,
      createdAt: new Date()
    });

    await graph.save();

    res.json(graph);
  } catch (error) {
    console.error('Error adding insight:', error);
    res.status(500).json({ error: 'Failed to add insight' });
  }
});

/**
 * PUT /api/relationship-graph/:id/node/:nodeId
 * Update node in graph
 */
router.put('/:id/node/:nodeId', auth, async (req, res) => {
  try {
    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const node = graph.nodes.find(n => n.id === req.params.nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Update node properties
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && req.body[key] !== undefined) {
        if (key === 'attributes') {
          node.attributes = { ...node.attributes, ...req.body.attributes };
        } else {
          node[key] = req.body[key];
        }
      }
    });

    graph.lastUpdated = new Date();
    await graph.save();

    res.json(graph);
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

/**
 * DELETE /api/relationship-graph/:id/node/:nodeId
 * Delete node from graph
 */
router.delete('/:id/node/:nodeId', auth, async (req, res) => {
  try {
    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Remove node
    graph.nodes = graph.nodes.filter(n => n.id !== req.params.nodeId);

    // Remove associated edges
    graph.edges = graph.edges.filter(
      e => e.source !== req.params.nodeId && e.target !== req.params.nodeId
    );

    // Recalculate analytics
    graph.analytics.totalNodes = graph.nodes.length;
    graph.analytics.totalEdges = graph.edges.length;
    graph.calculateCentrality();
    graph.findInfluencers();
    graph.detectClusters();

    graph.lastUpdated = new Date();
    await graph.save();

    res.json(graph);
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

/**
 * DELETE /api/relationship-graph/:id
 * Delete entire graph
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const graph = await RelationshipGraph.findById(req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    await graph.deleteOne();
    res.json({ message: 'Relationship graph deleted successfully' });
  } catch (error) {
    console.error('Error deleting graph:', error);
    res.status(500).json({ error: 'Failed to delete graph' });
  }
});

/**
 * GET /api/relationship-graph/analytics/overview
 * Get analytics overview across all graphs
 */
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const graphs = await RelationshipGraph.find({});

    const overview = {
      totalGraphs: graphs.length,
      totalNodes: 0,
      totalEdges: 0,
      averageDensity: 0,
      totalInfluencers: 0,
      totalClusters: 0,
      insightTypes: {
        new_connection: 0,
        key_person_left: 0,
        champion_identified: 0,
        blocker_detected: 0,
        referral_opportunity: 0,
        cross_sell_path: 0,
        risk_weak_connections: 0,
        opportunity_expand_network: 0
      }
    };

    graphs.forEach(graph => {
      overview.totalNodes += graph.analytics.totalNodes || 0;
      overview.totalEdges += graph.analytics.totalEdges || 0;
      overview.averageDensity += graph.analytics.density || 0;
      overview.totalInfluencers += graph.analytics.keyInfluencers?.length || 0;
      overview.totalClusters += graph.analytics.clusters?.length || 0;

      // Count insights by type
      graph.insights.forEach(insight => {
        if (overview.insightTypes[insight.type] !== undefined) {
          overview.insightTypes[insight.type]++;
        }
      });
    });

    overview.averageDensity = graphs.length > 0
      ? overview.averageDensity / graphs.length
      : 0;

    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
