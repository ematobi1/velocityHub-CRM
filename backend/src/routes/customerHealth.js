/**
 * Customer Health Routes
 * Comprehensive customer health scoring and analytics
 */

const express = require('express');
const router = express.Router();
const CustomerHealth = require('../models/CustomerHealth');
const { auth } = require('../middleware/auth');

/**
 * GET /api/customer-health
 * Get all customer health records
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, entityType, sortBy = 'overallScore', order = 'asc' } = req.query;

    const query = {};
    if (status) query.healthStatus = status;
    if (entityType) query.entityType = entityType;

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };

    const healthRecords = await CustomerHealth.find(query)
      .sort(sortOptions)
      .limit(100);

    res.json(healthRecords);
  } catch (error) {
    console.error('Error fetching health records:', error);
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

/**
 * GET /api/customer-health/entity/:entityType/:entityId
 * Get health record for specific entity
 */
router.get('/entity/:entityType/:entityId', auth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const healthRecord = await CustomerHealth.findOne({
      entityType,
      entityId
    });

    if (!healthRecord) {
      // Return mock data if no record exists
      return res.json({
        entityType,
        entityId,
        overallScore: 65,
        healthStatus: 'healthy',
        scores: {
          engagement: { score: 70, weight: 20 },
          product_usage: { score: 65, weight: 25 },
          financial: { score: 75, weight: 20 },
          support: { score: 60, weight: 15 },
          relationship: { score: 55, weight: 15 },
          growth: { score: 50, weight: 5 }
        },
        risks: [],
        opportunities: [],
        predictions: {
          churnRisk: { probability: 15, confidence: 75, factors: [] },
          expansionLikelihood: { probability: 40, confidence: 65 }
        },
        nextBestActions: [],
        trend: { direction: 'stable', changePercent: 0 }
      });
    }

    res.json(healthRecord);
  } catch (error) {
    console.error('Error fetching health record:', error);
    res.status(500).json({ error: 'Failed to fetch health record' });
  }
});

/**
 * POST /api/customer-health/calculate
 * Calculate health score for an entity
 */
router.post('/calculate', auth, async (req, res) => {
  try {
    const { entityType, entityId, scores } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'Entity type and ID are required' });
    }

    // Find or create health record
    let healthRecord = await CustomerHealth.findOne({ entityType, entityId });

    if (!healthRecord) {
      healthRecord = new CustomerHealth({
        entityType,
        entityId,
        scores: scores || {}
      });
    } else {
      // Update scores
      if (scores) {
        Object.keys(scores).forEach(key => {
          if (healthRecord.scores[key]) {
            healthRecord.scores[key].score = scores[key].score || healthRecord.scores[key].score;
            if (scores[key].metrics) {
              healthRecord.scores[key].metrics = {
                ...healthRecord.scores[key].metrics,
                ...scores[key].metrics
              };
            }
          }
        });
      }
    }

    // Calculate overall score
    healthRecord.calculateOverallScore();

    // Add to history
    healthRecord.addToHistory();

    // Detect trend
    healthRecord.detectTrend();

    await healthRecord.save();

    res.json(healthRecord);
  } catch (error) {
    console.error('Error calculating health:', error);
    res.status(500).json({ error: 'Failed to calculate health' });
  }
});

/**
 * GET /api/customer-health/at-risk
 * Get customers at risk of churn
 */
router.get('/at-risk', auth, async (req, res) => {
  try {
    const { threshold = 40 } = req.query;

    const atRiskCustomers = await CustomerHealth.find({
      $or: [
        { healthStatus: { $in: ['critical', 'at_risk'] } },
        { overallScore: { $lt: threshold } },
        { 'predictions.churnRisk.probability': { $gt: 50 } }
      ]
    })
      .sort({ 'predictions.churnRisk.probability': -1 })
      .limit(50);

    res.json(atRiskCustomers);
  } catch (error) {
    console.error('Error fetching at-risk customers:', error);
    res.status(500).json({ error: 'Failed to fetch at-risk customers' });
  }
});

/**
 * GET /api/customer-health/opportunities
 * Get expansion/upsell opportunities
 */
router.get('/opportunities', auth, async (req, res) => {
  try {
    const opportunities = await CustomerHealth.find({
      healthStatus: { $in: ['healthy', 'excellent'] },
      'opportunities.0': { $exists: true }
    })
      .sort({ 'predictions.expansionLikelihood.probability': -1 })
      .limit(50);

    res.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

/**
 * POST /api/customer-health/:id/risk
 * Add a risk to health record
 */
router.post('/:id/risk', auth, async (req, res) => {
  try {
    const { type, severity, description, impact, mitigationActions } = req.body;

    const healthRecord = await CustomerHealth.findById(req.params.id);

    if (!healthRecord) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    healthRecord.risks.push({
      type,
      severity,
      description,
      detectedAt: new Date(),
      impact: impact || -10,
      mitigationActions: mitigationActions || []
    });

    // Recalculate score
    healthRecord.calculateOverallScore();

    await healthRecord.save();

    res.json(healthRecord);
  } catch (error) {
    console.error('Error adding risk:', error);
    res.status(500).json({ error: 'Failed to add risk' });
  }
});

/**
 * POST /api/customer-health/:id/opportunity
 * Add an opportunity to health record
 */
router.post('/:id/opportunity', auth, async (req, res) => {
  try {
    const { type, potential, description, estimatedValue, recommendedActions } = req.body;

    const healthRecord = await CustomerHealth.findById(req.params.id);

    if (!healthRecord) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    healthRecord.opportunities.push({
      type,
      potential,
      description,
      estimatedValue,
      identifiedAt: new Date(),
      recommendedActions: recommendedActions || []
    });

    await healthRecord.save();

    res.json(healthRecord);
  } catch (error) {
    console.error('Error adding opportunity:', error);
    res.status(500).json({ error: 'Failed to add opportunity' });
  }
});

/**
 * GET /api/customer-health/:id/history
 * Get health score history
 */
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const healthRecord = await CustomerHealth.findById(req.params.id);

    if (!healthRecord) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const history = healthRecord.history.filter(
      entry => entry.date >= cutoffDate
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/customer-health/analytics/overview
 * Get health analytics overview
 */
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const healthRecords = await CustomerHealth.find({});

    const overview = {
      totalCustomers: healthRecords.length,
      byStatus: {
        excellent: 0,
        healthy: 0,
        stable: 0,
        at_risk: 0,
        critical: 0
      },
      averageScore: 0,
      atRiskCount: 0,
      opportunityCount: 0,
      totalRisks: 0,
      totalOpportunities: 0,
      churnPrediction: {
        high: 0,
        medium: 0,
        low: 0
      },
      trends: {
        improving: 0,
        stable: 0,
        declining: 0
      }
    };

    let totalScore = 0;

    healthRecords.forEach(record => {
      // Count by status
      overview.byStatus[record.healthStatus]++;

      // Sum scores
      totalScore += record.overallScore;

      // At risk count
      if (record.healthStatus === 'at_risk' || record.healthStatus === 'critical') {
        overview.atRiskCount++;
      }

      // Opportunity count
      if (record.opportunities.length > 0) {
        overview.opportunityCount++;
      }

      // Count risks and opportunities
      overview.totalRisks += record.risks.length;
      overview.totalOpportunities += record.opportunities.length;

      // Churn prediction
      if (record.predictions?.churnRisk?.probability) {
        if (record.predictions.churnRisk.probability > 60) {
          overview.churnPrediction.high++;
        } else if (record.predictions.churnRisk.probability > 30) {
          overview.churnPrediction.medium++;
        } else {
          overview.churnPrediction.low++;
        }
      }

      // Trends
      if (record.trend?.direction) {
        if (record.trend.direction === 'improving') {
          overview.trends.improving++;
        } else if (record.trend.direction === 'declining' || record.trend.direction === 'critical_decline') {
          overview.trends.declining++;
        } else {
          overview.trends.stable++;
        }
      }
    });

    overview.averageScore = healthRecords.length > 0
      ? Math.round(totalScore / healthRecords.length)
      : 0;

    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/customer-health/analytics/trends
 * Get health trends over time
 */
router.get('/analytics/trends', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const healthRecords = await CustomerHealth.find({});

    // Aggregate scores by day
    const trends = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    healthRecords.forEach(record => {
      record.history.forEach(entry => {
        if (entry.date >= cutoffDate) {
          const dateKey = entry.date.toISOString().split('T')[0];
          if (!trends[dateKey]) {
            trends[dateKey] = {
              date: dateKey,
              averageScore: 0,
              count: 0,
              excellent: 0,
              healthy: 0,
              stable: 0,
              at_risk: 0,
              critical: 0
            };
          }
          trends[dateKey].averageScore += entry.score;
          trends[dateKey].count++;
          trends[dateKey][entry.status]++;
        }
      });
    });

    // Calculate averages
    const trendArray = Object.values(trends).map(day => ({
      ...day,
      averageScore: Math.round(day.averageScore / day.count)
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json(trendArray);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * DELETE /api/customer-health/:id
 * Delete health record
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const healthRecord = await CustomerHealth.findById(req.params.id);

    if (!healthRecord) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    await healthRecord.deleteOne();
    res.json({ message: 'Health record deleted successfully' });
  } catch (error) {
    console.error('Error deleting health record:', error);
    res.status(500).json({ error: 'Failed to delete health record' });
  }
});

module.exports = router;
