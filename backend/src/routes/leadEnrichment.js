const express = require('express');
const router = express.Router();
const leadEnrichmentService = require('../services/leadEnrichment');
const logger = require('../utils/logger');

/**
 * @route   POST /api/lead-enrichment/enrich/:leadId
 * @desc    Enrich a single lead
 * @access  Private
 */
router.post('/enrich/:leadId', async (req, res) => {
  try {
    const result = await leadEnrichmentService.enrichLead(req.params.leadId, req.body);
    res.json(result);
  } catch (error) {
    logger.error('Enrich lead error:', error);
    res.status(500).json({ error: 'Failed to enrich lead' });
  }
});

/**
 * @route   POST /api/lead-enrichment/bulk-enrich
 * @desc    Enrich multiple leads
 * @access  Private
 */
router.post('/bulk-enrich', async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    const results = await leadEnrichmentService.bulkEnrichLeads(leadIds);
    res.json(results);
  } catch (error) {
    logger.error('Bulk enrich error:', error);
    res.status(500).json({ error: 'Failed to bulk enrich leads' });
  }
});

/**
 * @route   POST /api/lead-enrichment/find-email
 * @desc    Find email for a person
 * @access  Private
 */
router.post('/find-email', async (req, res) => {
  try {
    const { firstName, lastName, companyDomain } = req.body;

    if (!firstName || !lastName || !companyDomain) {
      return res.status(400).json({ error: 'firstName, lastName, and companyDomain are required' });
    }

    const result = await leadEnrichmentService.findEmail(firstName, lastName, companyDomain);
    res.json(result);
  } catch (error) {
    logger.error('Find email error:', error);
    res.status(500).json({ error: 'Failed to find email' });
  }
});

/**
 * @route   POST /api/lead-enrichment/verify-email
 * @desc    Verify email deliverability
 * @access  Private
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const result = await leadEnrichmentService.verifyEmail(email);
    res.json(result);
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

/**
 * @route   GET /api/lead-enrichment/usage
 * @desc    Get enrichment usage stats
 * @access  Private
 */
router.get('/usage', async (req, res) => {
  try {
    const usage = await leadEnrichmentService.getEnrichmentUsage(req.user.id);
    res.json(usage);
  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to retrieve usage' });
  }
});

module.exports = router;
