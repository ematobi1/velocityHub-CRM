const express = require('express');
const router = express.Router();
const socialMediaService = require('../services/socialMediaIntegration');
const SocialProfile = require('../models/SocialProfile');
const logger = require('../utils/logger');

/**
 * @route   POST /api/social-media/linkedin/search
 * @desc    Search LinkedIn profiles
 * @access  Private
 */
router.post('/linkedin/search', async (req, res) => {
  try {
    const results = await socialMediaService.searchLinkedIn(req.body);
    res.json(results);
  } catch (error) {
    logger.error('LinkedIn search error:', error);
    res.status(500).json({ error: 'Failed to search LinkedIn' });
  }
});

/**
 * @route   POST /api/social-media/linkedin/import
 * @desc    Import LinkedIn profile
 * @access  Private
 */
router.post('/linkedin/import', async (req, res) => {
  try {
    const { profileUrl, createLead } = req.body;

    if (!profileUrl) {
      return res.status(400).json({ error: 'profileUrl is required' });
    }

    const socialProfile = await socialMediaService.importLinkedInProfile(
      profileUrl,
      { createLead }
    );

    res.json(socialProfile);
  } catch (error) {
    logger.error('LinkedIn import error:', error);
    res.status(500).json({ error: 'Failed to import LinkedIn profile' });
  }
});

/**
 * @route   POST /api/social-media/twitter/search
 * @desc    Search Twitter profiles
 * @access  Private
 */
router.post('/twitter/search', async (req, res) => {
  try {
    const results = await socialMediaService.searchTwitter(req.body);
    res.json(results);
  } catch (error) {
    logger.error('Twitter search error:', error);
    res.status(500).json({ error: 'Failed to search Twitter' });
  }
});

/**
 * @route   POST /api/social-media/twitter/import
 * @desc    Import Twitter profile
 * @access  Private
 */
router.post('/twitter/import', async (req, res) => {
  try {
    const { username, createLead } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    const socialProfile = await socialMediaService.importTwitterProfile(
      username,
      { createLead }
    );

    res.json(socialProfile);
  } catch (error) {
    logger.error('Twitter import error:', error);
    res.status(500).json({ error: 'Failed to import Twitter profile' });
  }
});

/**
 * @route   GET /api/social-media/profiles
 * @desc    Get all social profiles
 * @access  Private
 */
router.get('/profiles', async (req, res) => {
  try {
    const { platform, lead, contact, company } = req.query;

    const query = {};
    if (platform) query.platform = platform;
    if (lead) query.lead = lead;
    if (contact) query.contact = contact;
    if (company) query.company = company;

    const profiles = await SocialProfile.find(query)
      .populate('lead', 'firstName lastName email company')
      .populate('contact', 'firstName lastName email')
      .sort({ lastSynced: -1 });

    res.json({ profiles });
  } catch (error) {
    logger.error('Get social profiles error:', error);
    res.status(500).json({ error: 'Failed to retrieve social profiles' });
  }
});

/**
 * @route   GET /api/social-media/profiles/:id
 * @desc    Get social profile by ID
 * @access  Private
 */
router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await SocialProfile.findById(req.params.id)
      .populate('lead', 'firstName lastName email company')
      .populate('contact', 'firstName lastName email');

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    logger.error('Get social profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve social profile' });
  }
});

/**
 * @route   POST /api/social-media/profiles/:id/sync
 * @desc    Sync social profile activity
 * @access  Private
 */
router.post('/profiles/:id/sync', async (req, res) => {
  try {
    const profile = await SocialProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const identifier = profile.platform === 'linkedin'
      ? profile.profileId
      : profile.username;

    const updatedProfile = await socialMediaService.syncRecentActivity(
      req.params.id,
      profile.platform,
      identifier
    );

    res.json(updatedProfile);
  } catch (error) {
    logger.error('Sync profile error:', error);
    res.status(500).json({ error: 'Failed to sync profile' });
  }
});

/**
 * @route   GET /api/social-media/profiles/:id/insights
 * @desc    Get social profile insights and recommendations
 * @access  Private
 */
router.get('/profiles/:id/insights', async (req, res) => {
  try {
    const insights = await socialMediaService.getProfileInsights(req.params.id);
    res.json(insights);
  } catch (error) {
    logger.error('Get profile insights error:', error);
    res.status(500).json({ error: 'Failed to retrieve insights' });
  }
});

/**
 * @route   POST /api/social-media/profiles/:id/interaction
 * @desc    Log an interaction with a social profile
 * @access  Private
 */
router.post('/profiles/:id/interaction', async (req, res) => {
  try {
    const { type, note } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Interaction type is required' });
    }

    const profile = await SocialProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    profile.addInteraction(type, note, req.user.id);
    await profile.save();

    res.json(profile);
  } catch (error) {
    logger.error('Log interaction error:', error);
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

/**
 * @route   POST /api/social-media/profiles/:id/create-lead
 * @desc    Create lead from social profile
 * @access  Private
 */
router.post('/profiles/:id/create-lead', async (req, res) => {
  try {
    const profile = await SocialProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const lead = await socialMediaService.createLeadFromProfile(profile);

    res.json({ lead, profile });
  } catch (error) {
    logger.error('Create lead from profile error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

/**
 * @route   POST /api/social-media/monitor/mentions
 * @desc    Monitor brand mentions across social platforms
 * @access  Private (Admin/Manager)
 */
router.post('/monitor/mentions', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { keywords, platforms } = req.body;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'keywords array is required' });
    }

    const mentions = await socialMediaService.monitorBrandMentions(keywords, platforms);

    res.json({ mentions });
  } catch (error) {
    logger.error('Monitor mentions error:', error);
    res.status(500).json({ error: 'Failed to monitor mentions' });
  }
});

/**
 * @route   GET /api/social-media/analytics/overview
 * @desc    Get social media analytics overview
 * @access  Private
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const profiles = await SocialProfile.find({ isActive: true });

    const analytics = {
      totalProfiles: profiles.length,
      byPlatform: {
        linkedin: profiles.filter(p => p.platform === 'linkedin').length,
        twitter: profiles.filter(p => p.platform === 'twitter').length
      },
      linkedToLeads: profiles.filter(p => p.lead).length,
      averageEngagement: 0,
      highEngagementProfiles: [],
      recentSignals: []
    };

    // Calculate average engagement
    let totalEngagement = 0;
    const highEngagement = [];

    profiles.forEach(profile => {
      const score = profile.calculateEngagementScore();
      totalEngagement += score;

      if (score > 70) {
        highEngagement.push({
          _id: profile._id,
          displayName: profile.displayName,
          platform: profile.platform,
          engagementScore: score
        });
      }
    });

    analytics.averageEngagement = profiles.length > 0
      ? totalEngagement / profiles.length
      : 0;

    analytics.highEngagementProfiles = highEngagement
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    // Recent signals
    const allSignals = [];
    profiles.forEach(profile => {
      profile.signals.forEach(signal => {
        allSignals.push({
          ...signal.toObject(),
          profileId: profile._id,
          profileName: profile.displayName
        });
      });
    });

    analytics.recentSignals = allSignals
      .sort((a, b) => b.date - a.date)
      .slice(0, 20);

    res.json(analytics);
  } catch (error) {
    logger.error('Get social analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

/**
 * @route   DELETE /api/social-media/profiles/:id
 * @desc    Delete social profile
 * @access  Private
 */
router.delete('/profiles/:id', async (req, res) => {
  try {
    const profile = await SocialProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await profile.deleteOne();

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    logger.error('Delete profile error:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

module.exports = router;
