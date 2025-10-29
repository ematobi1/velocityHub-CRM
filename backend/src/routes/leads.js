const express = require('express');
const Lead = require('../models/Lead');
const { auth, authorize } = require('../middleware/auth');
const leadScoringService = require('../ai/leadScoring');
const { Parser } = require('json2csv');

const router = express.Router();

// Get all leads
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      source,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = { isArchived: false };

    // Filter by user role
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    if (status) query.status = status;
    if (source) query.source = source;

    // Search
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') }
      ];
    }

    // Execute query
    const leads = await Lead.find(query)
      .populate('owner', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(query);

    res.json({
      leads,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('dealId');

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_rep' && lead.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create lead
router.post('/', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      website,
      industry,
      companySize,
      source,
      estimatedValue,
      description,
      tags
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Please provide firstName, lastName, and email' });
    }

    // Check for duplicate
    const existing = await Lead.findOne({
      email: email.toLowerCase(),
      owner: req.user._id
    });

    if (existing) {
      return res.status(400).json({
        error: 'Lead with this email already exists',
        existingLead: existing._id
      });
    }

    // Create lead
    const lead = new Lead({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      company,
      jobTitle,
      website,
      industry,
      companySize,
      source: source || 'other',
      estimatedValue,
      description,
      tags: tags || [],
      owner: req.user._id,
      status: 'new',
      aiScore: {
        overall: 50, // Default score
        engagement: 0,
        fit: 0,
        intent: 0,
        timing: 0
      }
    });

    await lead.save();

    // Trigger AI scoring in background (would use job queue in production)
    lead.updateAIScore().catch(err => console.error('AI scoring failed:', err));

    res.status(201).json({ lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.patch('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_rep' && lead.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update fields
    const allowedUpdates = [
      'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle',
      'website', 'industry', 'companySize', 'status', 'source',
      'estimatedValue', 'description', 'tags', 'address', 'socialMedia',
      'qualificationCriteria', 'customFields'
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        lead[key] = req.body[key];
      }
    });

    await lead.save();

    // Trigger AI re-scoring if status changed
    if (req.body.status) {
      lead.updateAIScore().catch(err => console.error('AI scoring failed:', err));
    }

    res.json({ lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Soft delete
    lead.isArchived = true;
    lead.archivedAt = new Date();
    await lead.save();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Add note to lead
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    lead.notes.push({
      content,
      createdBy: req.user._id,
      createdAt: new Date()
    });

    await lead.save();

    res.json({ lead });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Convert lead to deal
router.post('/:id/convert', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.convertedToDeal) {
      return res.status(400).json({ error: 'Lead already converted' });
    }

    // This would create a contact, company, and deal
    // Simplified for MVP
    lead.convertedToDeal = true;
    lead.convertedAt = new Date();
    lead.status = 'converted';

    await lead.save();

    res.json({
      message: 'Lead converted successfully',
      lead
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Bulk operations
router.post('/bulk', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { action, leadIds, data } = req.body;

    if (!action || !leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'Invalid bulk operation request' });
    }

    let result;

    switch (action) {
      case 'delete':
        result = await Lead.updateMany(
          { _id: { $in: leadIds } },
          { isArchived: true, archivedAt: new Date() }
        );
        break;

      case 'update_status':
        if (!data.status) {
          return res.status(400).json({ error: 'Status is required' });
        }
        result = await Lead.updateMany(
          { _id: { $in: leadIds } },
          { status: data.status }
        );
        break;

      case 'assign':
        if (!data.owner) {
          return res.status(400).json({ error: 'Owner is required' });
        }
        result = await Lead.updateMany(
          { _id: { $in: leadIds } },
          { owner: data.owner }
        );
        break;

      case 'add_tag':
        if (!data.tag) {
          return res.status(400).json({ error: 'Tag is required' });
        }
        result = await Lead.updateMany(
          { _id: { $in: leadIds } },
          { $addToSet: { tags: data.tag } }
        );
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      message: `Bulk ${action} completed`,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Bulk operation failed' });
  }
});

// Get lead statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const query = { isArchived: false };

    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    const [total, byStatus, bySource, recentlyCreated] = await Promise.all([
      Lead.countDocuments(query),
      Lead.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: query },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Calculate average AI score
    const avgScore = await Lead.aggregate([
      { $match: query },
      { $group: { _id: null, avgScore: { $avg: '$aiScore.overall' } } }
    ]);

    res.json({
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      bySource: bySource.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentlyCreated,
      averageAIScore: avgScore[0]?.avgScore || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============ AI SCORING ENDPOINTS ============

// Calculate score for a single lead
router.post('/:id/score', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Calculate score
    const scoring = await leadScoringService.calculateScore(lead);

    // Update lead with new score
    lead.aiScore = {
      overall: scoring.score,
      breakdown: scoring.breakdown,
      grade: scoring.grade,
      insights: scoring.insights,
      recommendedActions: scoring.actions,
      lastCalculated: scoring.lastCalculated
    };

    await lead.save();

    res.json({
      success: true,
      leadId: lead._id,
      scoring: lead.aiScore
    });
  } catch (error) {
    console.error('Score calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate score' });
  }
});

// Batch score multiple leads
router.post('/batch/score', auth, async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    const leads = await Lead.find({ _id: { $in: leadIds } });

    if (leads.length === 0) {
      return res.status(404).json({ error: 'No leads found' });
    }

    // Score all leads
    const results = await leadScoringService.batchScore(leads);

    // Update leads with new scores
    const updatePromises = results.map(async (result) => {
      if (!result.error) {
        await Lead.findByIdAndUpdate(result.leadId, {
          aiScore: {
            overall: result.score,
            breakdown: result.breakdown,
            grade: result.grade,
            insights: result.insights,
            recommendedActions: result.actions,
            lastCalculated: result.lastCalculated
          }
        });
      }
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      totalScored: results.filter(r => !r.error).length,
      results
    });
  } catch (error) {
    console.error('Batch score error:', error);
    res.status(500).json({ error: 'Failed to batch score' });
  }
});

// Score all leads (admin only)
router.post('/score-all', auth, authorize('admin'), async (req, res) => {
  try {
    const query = { isArchived: false };

    // Get all leads in batches
    const batchSize = 100;
    const totalLeads = await Lead.countDocuments(query);
    const batches = Math.ceil(totalLeads / batchSize);

    let totalScored = 0;

    for (let i = 0; i < batches; i++) {
      const leads = await Lead.find(query)
        .skip(i * batchSize)
        .limit(batchSize);

      const results = await leadScoringService.batchScore(leads);

      // Update leads
      const updatePromises = results.map(async (result) => {
        if (!result.error) {
          await Lead.findByIdAndUpdate(result.leadId, {
            aiScore: {
              overall: result.score,
              breakdown: result.breakdown,
              grade: result.grade,
              insights: result.insights,
              recommendedActions: result.actions,
              lastCalculated: result.lastCalculated
            }
          });
          totalScored++;
        }
      });

      await Promise.all(updatePromises);
    }

    res.json({
      success: true,
      message: `Successfully scored ${totalScored} leads`,
      totalScored,
      totalLeads
    });
  } catch (error) {
    console.error('Score all error:', error);
    res.status(500).json({ error: 'Failed to score all leads' });
  }
});

// Get leads by score range
router.get('/by-score/:range', auth, async (req, res) => {
  try {
    const { range } = req.params; // hot, warm, cold, poor
    const thresholds = leadScoringService.getThresholds();

    let query = { isArchived: false };

    // Add role-based filtering
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    // Add score range
    switch(range.toLowerCase()) {
      case 'hot':
        query['aiScore.overall'] = { $gte: thresholds.hot };
        break;
      case 'warm':
        query['aiScore.overall'] = { $gte: thresholds.warm, $lt: thresholds.hot };
        break;
      case 'cold':
        query['aiScore.overall'] = { $gte: thresholds.cold, $lt: thresholds.warm };
        break;
      case 'poor':
        query['aiScore.overall'] = { $lt: thresholds.cold };
        break;
      default:
        return res.status(400).json({ error: 'Invalid range. Use: hot, warm, cold, or poor' });
    }

    const leads = await Lead.find(query)
      .populate('owner', 'name email')
      .sort({ 'aiScore.overall': -1 })
      .limit(100);

    res.json({
      success: true,
      range,
      count: leads.length,
      leads
    });
  } catch (error) {
    console.error('Get leads by score error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead recommendations (smart suggestions)
router.get('/recommendations', auth, async (req, res) => {
  try {
    const query = { isArchived: false };

    // Add role-based filtering
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    // Get top 20 highest scoring leads that haven't been contacted recently
    const recommendations = await Lead.find({
      ...query,
      'aiScore.overall': { $gte: 60 }, // Minimum score of 60
      $or: [
        { lastContactedAt: null },
        { lastContactedAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } } // Not contacted in 3 days
      ]
    })
      .populate('owner', 'name email')
      .sort({ 'aiScore.overall': -1 })
      .limit(20);

    // Calculate priorities
    const withPriorities = recommendations.map(lead => {
      let priority = 'medium';
      const score = lead.aiScore?.overall || 0;

      if (score >= 80) priority = 'urgent';
      else if (score >= 70) priority = 'high';
      else if (score < 50) priority = 'low';

      return {
        ...lead.toObject(),
        priority,
        reason: score >= 80 ? 'Hot lead with high conversion potential' :
                score >= 70 ? 'Strong lead worth immediate attention' :
                'Good lead for follow-up'
      };
    });

    res.json({
      success: true,
      count: withPriorities.length,
      recommendations: withPriorities
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ============ BULK ACTIONS ============

// Bulk update leads
router.post('/bulk/update', auth, async (req, res) => {
  try {
    const { leadIds, updates } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' });
    }

    // Allowed fields to update
    const allowedFields = [
      'status', 'source', 'priority', 'owner', 'tags',
      'industry', 'notes', 'assignedTo'
    ];

    // Filter updates to only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Add updatedAt
    filteredUpdates.updatedAt = new Date();

    // Perform bulk update
    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: filteredUpdates }
    );

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} leads`,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to update leads' });
  }
});

// Bulk delete (archive) leads
router.post('/bulk/delete', auth, async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    // Soft delete by archiving
    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `Successfully archived ${result.modifiedCount} leads`,
      archived: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete leads' });
  }
});

// Bulk assign leads to owner
router.post('/bulk/assign', auth, async (req, res) => {
  try {
    const { leadIds, ownerId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          owner: ownerId,
          assignedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `Successfully assigned ${result.modifiedCount} leads`,
      assigned: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ error: 'Failed to assign leads' });
  }
});

// Bulk add tags
router.post('/bulk/add-tags', auth, async (req, res) => {
  try {
    const { leadIds, tags } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array is required' });
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      {
        $addToSet: { tags: { $each: tags } },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({
      success: true,
      message: `Successfully added tags to ${result.modifiedCount} leads`,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk add tags error:', error);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

// ============ CSV IMPORT/EXPORT ============

// Export leads to CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const {
      status,
      source,
      search,
      scoreRange
    } = req.query;

    // Build query
    const query = { isArchived: false };

    // Filter by user role
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    if (status) query.status = status;
    if (source) query.source = source;

    // Score range filter
    if (scoreRange) {
      const thresholds = leadScoringService.getThresholds();
      switch(scoreRange.toLowerCase()) {
        case 'hot':
          query['aiScore.overall'] = { $gte: thresholds.hot };
          break;
        case 'warm':
          query['aiScore.overall'] = { $gte: thresholds.warm, $lt: thresholds.hot };
          break;
        case 'cold':
          query['aiScore.overall'] = { $gte: thresholds.cold, $lt: thresholds.warm };
          break;
      }
    }

    // Search
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') }
      ];
    }

    // Get leads
    const leads = await Lead.find(query)
      .populate('owner', 'name email')
      .sort('-createdAt')
      .limit(10000); // Max 10k leads per export

    // Transform data for CSV
    const csvData = leads.map(lead => ({
      'First Name': lead.firstName,
      'Last Name': lead.lastName,
      'Email': lead.email,
      'Phone': lead.phone || '',
      'Company': lead.company || '',
      'Job Title': lead.jobTitle || '',
      'Industry': lead.industry || '',
      'Status': lead.status,
      'Source': lead.source || '',
      'AI Score': lead.aiScore?.overall || '',
      'Grade': lead.aiScore?.grade || '',
      'Tags': (lead.tags || []).join(', '),
      'Owner': lead.owner?.name || '',
      'Created At': lead.createdAt,
      'Last Contacted': lead.lastContactedAt || ''
    }));

    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${Date.now()}.csv`);

    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Import leads from CSV
router.post('/import/csv', auth, async (req, res) => {
  try {
    const { leads, options = {} } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const results = {
      total: leads.length,
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Process each lead
    for (const leadData of leads) {
      try {
        // Check for required fields
        if (!leadData.email) {
          results.skipped++;
          results.errors.push({ row: leadData, error: 'Email is required' });
          continue;
        }

        // Check for duplicates
        if (options.skipDuplicates) {
          const existing = await Lead.findOne({ email: leadData.email });
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        // Create lead
        const lead = new Lead({
          firstName: leadData.firstName || leadData['First Name'],
          lastName: leadData.lastName || leadData['Last Name'],
          email: leadData.email || leadData['Email'],
          phone: leadData.phone || leadData['Phone'],
          company: leadData.company || leadData['Company'],
          jobTitle: leadData.jobTitle || leadData['Job Title'],
          industry: leadData.industry || leadData['Industry'],
          status: leadData.status || 'new',
          source: leadData.source || leadData['Source'] || 'import',
          owner: options.assignTo || req.user._id,
          tags: leadData.tags ? (Array.isArray(leadData.tags) ? leadData.tags : leadData.tags.split(',').map(t => t.trim())) : [],
          createdBy: req.user._id
        });

        await lead.save();

        // Auto-score if enabled
        if (options.autoScore) {
          const scoring = await leadScoringService.calculateScore(lead);
          lead.aiScore = {
            overall: scoring.score,
            breakdown: scoring.breakdown,
            grade: scoring.grade,
            insights: scoring.insights,
            recommendedActions: scoring.actions,
            lastCalculated: scoring.lastCalculated
          };
          await lead.save();
        }

        results.imported++;
      } catch (error) {
        results.errors.push({
          row: leadData,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${results.imported} imported, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    console.error('Import CSV error:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// ============ DEDUPLICATION ============

// Find duplicate leads
router.get('/duplicates', auth, async (req, res) => {
  try {
    const query = req.user.role === 'sales_rep'
      ? { owner: req.user._id, isArchived: false }
      : { isArchived: false };

    // Find duplicates by email
    const duplicates = await Lead.aggregate([
      { $match: query },
      {
        $group: {
          _id: { email: '$email' },
          count: { $sum: 1 },
          leads: { $push: '$$ROOT' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 }
    ]);

    res.json({
      success: true,
      count: duplicates.length,
      duplicates: duplicates.map(dup => ({
        email: dup._id.email,
        count: dup.count,
        leads: dup.leads
      }))
    });
  } catch (error) {
    console.error('Find duplicates error:', error);
    res.status(500).json({ error: 'Failed to find duplicates' });
  }
});

// Merge duplicate leads
router.post('/merge', auth, async (req, res) => {
  try {
    const { primaryId, duplicateIds } = req.body;

    if (!primaryId || !duplicateIds || !Array.isArray(duplicateIds)) {
      return res.status(400).json({ error: 'primaryId and duplicateIds array required' });
    }

    const primaryLead = await Lead.findById(primaryId);
    if (!primaryLead) {
      return res.status(404).json({ error: 'Primary lead not found' });
    }

    const duplicates = await Lead.find({ _id: { $in: duplicateIds } });

    // Merge data from duplicates into primary
    duplicates.forEach(dup => {
      // Merge tags
      if (dup.tags && dup.tags.length > 0) {
        primaryLead.tags = [...new Set([...primaryLead.tags, ...dup.tags])];
      }

      // Merge notes
      if (dup.notes && dup.notes.length > 0) {
        primaryLead.notes.push(...dup.notes);
      }

      // Take most recent contact date
      if (dup.lastContactedAt && (!primaryLead.lastContactedAt || dup.lastContactedAt > primaryLead.lastContactedAt)) {
        primaryLead.lastContactedAt = dup.lastContactedAt;
      }

      // Merge engagement data
      primaryLead.engagement = primaryLead.engagement || {};
      if (dup.engagement) {
        primaryLead.engagement.emailOpens = (primaryLead.engagement.emailOpens || 0) + (dup.engagement.emailOpens || 0);
        primaryLead.engagement.emailClicks = (primaryLead.engagement.emailClicks || 0) + (dup.engagement.emailClicks || 0);
        primaryLead.engagement.websiteVisits = (primaryLead.engagement.websiteVisits || 0) + (dup.engagement.websiteVisits || 0);
      }

      // Fill in missing fields from duplicate
      if (!primaryLead.phone && dup.phone) primaryLead.phone = dup.phone;
      if (!primaryLead.company && dup.company) primaryLead.company = dup.company;
      if (!primaryLead.jobTitle && dup.jobTitle) primaryLead.jobTitle = dup.jobTitle;
      if (!primaryLead.industry && dup.industry) primaryLead.industry = dup.industry;
    });

    await primaryLead.save();

    // Archive duplicates
    await Lead.updateMany(
      { _id: { $in: duplicateIds } },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          mergedInto: primaryId
        }
      }
    );

    // Recalculate score for merged lead
    const scoring = await leadScoringService.calculateScore(primaryLead);
    primaryLead.aiScore = {
      overall: scoring.score,
      breakdown: scoring.breakdown,
      grade: scoring.grade,
      insights: scoring.insights,
      recommendedActions: scoring.actions,
      lastCalculated: scoring.lastCalculated
    };
    await primaryLead.save();

    res.json({
      success: true,
      message: `Successfully merged ${duplicateIds.length} leads into primary lead`,
      primaryLead
    });
  } catch (error) {
    console.error('Merge leads error:', error);
    res.status(500).json({ error: 'Failed to merge leads' });
  }
});

module.exports = router;
