const mongoose = require('mongoose');

const relationshipGraphSchema = new mongoose.Schema({
  // Node (person or organization)
  nodes: [{
    id: String,
    type: {
      type: String,
      enum: ['contact', 'lead', 'account', 'user', 'external']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    name: String,
    title: String,
    company: String,
    attributes: {
      role: String,
      seniority: String,
      decisionMaker: Boolean,
      champion: Boolean,
      influencer: Boolean,
      blocker: Boolean
    },
    centrality: Number, // graph centrality score
    influence: Number // influence score 0-100
  }],

  // Edges (relationships)
  edges: [{
    source: String, // node id
    target: String, // node id
    type: {
      type: String,
      enum: [
        'reports_to',
        'works_with',
        'referred_by',
        'knows',
        'board_member',
        'advisor',
        'partner',
        'competitor',
        'friend',
        'mentor',
        'former_colleague'
      ]
    },
    strength: Number, // 0-100
    frequency: Number, // interaction frequency
    lastInteraction: Date,
    source_platform: String, // 'linkedin', 'email', 'crm'
    bidirectional: Boolean
  }],

  // Account reference
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },

  // Graph Analytics
  analytics: {
    totalNodes: Number,
    totalEdges: Number,
    density: Number, // how interconnected
    keyInfluencers: [String], // node ids
    isolatedNodes: [String], // node ids with no connections
    clusters: [{
      id: String,
      members: [String],
      strength: Number
    }],
    pathsToDecisionMaker: [{
      contact: String,
      path: [String], // sequence of node ids
      strength: Number
    }]
  },

  // Insights
  insights: [{
    type: {
      type: String,
      enum: [
        'new_connection',
        'key_person_left',
        'champion_identified',
        'blocker_detected',
        'referral_opportunity',
        'cross_sell_path',
        'risk_weak_connections',
        'opportunity_expand_network'
      ]
    },
    description: String,
    nodes: [String],
    impact: String,
    actionRecommended: String,
    createdAt: Date
  }],

  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
relationshipGraphSchema.index({ account: 1 });
relationshipGraphSchema.index({ 'nodes.entityId': 1 });
relationshipGraphSchema.index({ lastUpdated: 1 });

// Methods
relationshipGraphSchema.methods.calculateCentrality = function() {
  // Simple degree centrality - count connections
  const nodeDegrees = {};

  this.nodes.forEach(node => {
    nodeDegrees[node.id] = 0;
  });

  this.edges.forEach(edge => {
    nodeDegrees[edge.source] = (nodeDegrees[edge.source] || 0) + 1;
    if (edge.bidirectional) {
      nodeDegrees[edge.target] = (nodeDegrees[edge.target] || 0) + 1;
    }
  });

  const maxDegree = Math.max(...Object.values(nodeDegrees));

  this.nodes.forEach(node => {
    node.centrality = maxDegree > 0 ? (nodeDegrees[node.id] / maxDegree) * 100 : 0;
  });
};

relationshipGraphSchema.methods.findInfluencers = function() {
  const influencers = this.nodes
    .filter(n => n.attributes.decisionMaker || n.attributes.champion || n.centrality > 70)
    .sort((a, b) => (b.influence || b.centrality) - (a.influence || a.centrality))
    .slice(0, 5)
    .map(n => n.id);

  this.analytics.keyInfluencers = influencers;
};

relationshipGraphSchema.methods.detectClusters = function() {
  // Simple clustering: groups of highly connected nodes
  const visited = new Set();
  const clusters = [];

  this.nodes.forEach(node => {
    if (visited.has(node.id)) return;

    const cluster = { id: `cluster_${clusters.length}`, members: [node.id], strength: 0 };
    const queue = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift();
      const connections = this.edges.filter(e =>
        e.source === current || (e.bidirectional && e.target === current)
      );

      connections.forEach(edge => {
        const next = edge.source === current ? edge.target : edge.source;
        if (!visited.has(next) && edge.strength > 50) {
          visited.add(next);
          cluster.members.push(next);
          cluster.strength += edge.strength;
          queue.push(next);
        }
      });
    }

    if (cluster.members.length > 1) {
      cluster.strength /= cluster.members.length;
      clusters.push(cluster);
    }
  });

  this.analytics.clusters = clusters;
};

module.exports = mongoose.model('RelationshipGraph', relationshipGraphSchema);
