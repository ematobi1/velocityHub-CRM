/**
 * Social Media Integration Service
 * Handles LinkedIn, Twitter, and other social platform integrations
 */

const SocialProfile = require('../models/SocialProfile');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const logger = require('../utils/logger');

class SocialMediaIntegrationService {
  constructor() {
    // API configuration (would be loaded from environment)
    this.config = {
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: process.env.LINKEDIN_REDIRECT_URI
      },
      twitter: {
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        bearerToken: process.env.TWITTER_BEARER_TOKEN
      }
    };
  }

  /**
   * Search for LinkedIn profiles
   */
  async searchLinkedIn(query) {
    try {
      logger.info(`Searching LinkedIn for: ${query.keywords}`);

      // In production, this would call LinkedIn API
      // For now, return mock data

      const mockResults = this.generateMockLinkedInResults(query);

      return {
        results: mockResults,
        total: mockResults.length,
        query
      };
    } catch (error) {
      logger.error('LinkedIn search error:', error);
      throw error;
    }
  }

  /**
   * Import LinkedIn profile
   */
  async importLinkedInProfile(profileUrl, options = {}) {
    try {
      logger.info(`Importing LinkedIn profile: ${profileUrl}`);

      // Extract profile data (mock implementation)
      const profileData = await this.scrapeLinkedInProfile(profileUrl);

      // Create or update social profile
      const socialProfile = await SocialProfile.findOneAndUpdate(
        { platform: 'linkedin', profileUrl },
        {
          platform: 'linkedin',
          profileUrl,
          profileId: profileData.publicIdentifier,
          displayName: profileData.name,
          headline: profileData.headline,
          location: profileData.location,
          profilePicture: profileData.profilePicture,
          linkedin: {
            position: profileData.position,
            company: profileData.company,
            industry: profileData.industry,
            connectionDegree: profileData.connectionDegree,
            mutualConnections: profileData.mutualConnections,
            skills: profileData.skills,
            publicIdentifier: profileData.publicIdentifier
          },
          enrichmentData: {
            workHistory: profileData.workHistory,
            education: profileData.education
          },
          lastSynced: new Date(),
          syncStatus: 'success'
        },
        { upsert: true, new: true }
      );

      // If createLead option is true, create a lead
      if (options.createLead) {
        await this.createLeadFromProfile(socialProfile);
      }

      return socialProfile;
    } catch (error) {
      logger.error('LinkedIn import error:', error);
      throw error;
    }
  }

  /**
   * Scrape LinkedIn profile (mock implementation)
   */
  async scrapeLinkedInProfile(profileUrl) {
    // In production, this would use a service like PhantomBuster or Apify
    // For now, return mock data

    const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis'];
    const positions = ['Sales Director', 'Marketing Manager', 'CEO', 'VP of Engineering'];
    const companies = ['Tech Corp', 'Digital Solutions', 'Innovation Labs', 'Growth Partners'];
    const industries = ['Technology', 'Marketing', 'Finance', 'Healthcare'];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const [firstName, lastName] = randomName.split(' ');

    return {
      name: randomName,
      firstName,
      lastName,
      headline: `${positions[Math.floor(Math.random() * positions.length)]} at ${companies[Math.floor(Math.random() * companies.length)]}`,
      position: positions[Math.floor(Math.random() * positions.length)],
      company: companies[Math.floor(Math.random() * companies.length)],
      industry: industries[Math.floor(Math.random() * industries.length)],
      location: 'San Francisco, CA',
      connectionDegree: ['2nd', '3rd'][Math.floor(Math.random() * 2)],
      mutualConnections: Math.floor(Math.random() * 50) + 5,
      skills: ['Sales', 'Marketing', 'Business Development', 'Strategy'],
      publicIdentifier: profileUrl.split('/').pop(),
      profilePicture: 'https://via.placeholder.com/200',
      workHistory: [
        {
          company: companies[Math.floor(Math.random() * companies.length)],
          title: positions[Math.floor(Math.random() * positions.length)],
          startDate: new Date('2020-01-01'),
          current: true
        }
      ],
      education: [
        {
          school: 'Stanford University',
          degree: 'MBA',
          field: 'Business Administration',
          startYear: 2015,
          endYear: 2017
        }
      ]
    };
  }

  /**
   * Search Twitter profiles
   */
  async searchTwitter(query) {
    try {
      logger.info(`Searching Twitter for: ${query.keywords}`);

      // In production, this would call Twitter API
      const mockResults = this.generateMockTwitterResults(query);

      return {
        results: mockResults,
        total: mockResults.length,
        query
      };
    } catch (error) {
      logger.error('Twitter search error:', error);
      throw error;
    }
  }

  /**
   * Import Twitter profile
   */
  async importTwitterProfile(username, options = {}) {
    try {
      logger.info(`Importing Twitter profile: @${username}`);

      // Get profile data
      const profileData = await this.getTwitterProfile(username);

      // Create or update social profile
      const socialProfile = await SocialProfile.findOneAndUpdate(
        { platform: 'twitter', username },
        {
          platform: 'twitter',
          profileId: profileData.id,
          profileUrl: `https://twitter.com/${username}`,
          username,
          displayName: profileData.name,
          bio: profileData.bio,
          location: profileData.location,
          profilePicture: profileData.profileImage,
          twitter: {
            followerCount: profileData.followerCount,
            followingCount: profileData.followingCount,
            tweetCount: profileData.tweetCount,
            verified: profileData.verified,
            bio: profileData.bio,
            website: profileData.website
          },
          lastSynced: new Date(),
          syncStatus: 'success'
        },
        { upsert: true, new: true }
      );

      // Get recent tweets
      await this.syncRecentActivity(socialProfile._id, 'twitter', username);

      return socialProfile;
    } catch (error) {
      logger.error('Twitter import error:', error);
      throw error;
    }
  }

  /**
   * Get Twitter profile data (mock implementation)
   */
  async getTwitterProfile(username) {
    // Mock implementation
    return {
      id: `twitter_${username}`,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      bio: 'Entrepreneur | Tech Enthusiast | Building the future',
      location: 'San Francisco, CA',
      followerCount: Math.floor(Math.random() * 10000) + 1000,
      followingCount: Math.floor(Math.random() * 1000) + 100,
      tweetCount: Math.floor(Math.random() * 5000) + 500,
      verified: Math.random() > 0.8,
      profileImage: 'https://via.placeholder.com/200',
      website: `https://${username}.com`
    };
  }

  /**
   * Sync recent activity for a social profile
   */
  async syncRecentActivity(profileId, platform, identifier) {
    try {
      const socialProfile = await SocialProfile.findById(profileId);

      if (!socialProfile) {
        throw new Error('Social profile not found');
      }

      let recentActivity = [];

      if (platform === 'linkedin') {
        recentActivity = await this.getLinkedInActivity(identifier);
      } else if (platform === 'twitter') {
        recentActivity = await this.getTwitterActivity(identifier);
      }

      socialProfile.recentActivity = recentActivity;
      socialProfile.lastSynced = new Date();
      socialProfile.syncStatus = 'success';

      // Update engagement metrics
      if (recentActivity.length > 0) {
        const avgLikes = recentActivity.reduce((sum, a) => sum + (a.likes || 0), 0) / recentActivity.length;
        const avgComments = recentActivity.reduce((sum, a) => sum + (a.comments || 0), 0) / recentActivity.length;
        const avgShares = recentActivity.reduce((sum, a) => sum + (a.shares || 0), 0) / recentActivity.length;

        socialProfile.engagement = {
          ...socialProfile.engagement,
          lastActive: recentActivity[0].date,
          avgLikes,
          avgComments,
          avgShares,
          engagementRate: ((avgLikes + avgComments + avgShares) / recentActivity.length) * 100
        };
      }

      await socialProfile.save();

      return socialProfile;
    } catch (error) {
      logger.error('Sync activity error:', error);
      throw error;
    }
  }

  /**
   * Get LinkedIn activity (mock)
   */
  async getLinkedInActivity(profileId) {
    const activities = [];
    const contentTemplates = [
      'Excited to announce our new product launch!',
      'Looking for talented professionals to join our team',
      'Great insights from today\'s industry conference',
      'Proud of our team\'s achievements this quarter'
    ];

    for (let i = 0; i < 5; i++) {
      activities.push({
        type: 'post',
        content: contentTemplates[Math.floor(Math.random() * contentTemplates.length)],
        url: `https://linkedin.com/feed/update/${i}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        likes: Math.floor(Math.random() * 100) + 10,
        comments: Math.floor(Math.random() * 20) + 2,
        shares: Math.floor(Math.random() * 10) + 1
      });
    }

    return activities;
  }

  /**
   * Get Twitter activity (mock)
   */
  async getTwitterActivity(username) {
    const activities = [];
    const contentTemplates = [
      'Building something amazing at @company! #startup #tech',
      'Great meeting with potential customers today',
      'Thoughts on the future of AI in sales',
      'Hiring! Looking for a talented sales engineer'
    ];

    for (let i = 0; i < 10; i++) {
      activities.push({
        type: 'post',
        content: contentTemplates[Math.floor(Math.random() * contentTemplates.length)],
        url: `https://twitter.com/${username}/status/${Date.now() + i}`,
        date: new Date(Date.now() - i * 6 * 60 * 60 * 1000),
        likes: Math.floor(Math.random() * 50) + 5,
        comments: Math.floor(Math.random() * 10) + 1,
        shares: Math.floor(Math.random() * 5) + 1
      });
    }

    return activities;
  }

  /**
   * Detect buying signals from social activity
   */
  async detectBuyingSignals(profileId) {
    try {
      const socialProfile = await SocialProfile.findById(profileId);

      if (!socialProfile) {
        throw new Error('Social profile not found');
      }

      const signals = [];

      // Job change signal
      const recentJobChange = socialProfile.signals.find(
        s => s.type === 'job_change' && (Date.now() - s.date.getTime()) < 90 * 24 * 60 * 60 * 1000
      );

      if (recentJobChange) {
        signals.push({
          type: 'job_change',
          description: 'Recently changed jobs - likely evaluating new tools',
          date: recentJobChange.date,
          relevance: 'high'
        });
      }

      // Active posting signal
      const recentPosts = socialProfile.recentActivity.filter(
        a => (Date.now() - a.date.getTime()) < 7 * 24 * 60 * 60 * 1000
      );

      if (recentPosts.length >= 3) {
        signals.push({
          type: 'active_posting',
          description: 'Very active on social media - engaged and responsive',
          date: new Date(),
          relevance: 'medium'
        });
      }

      // Hiring signal (from content analysis)
      const hiringPosts = socialProfile.recentActivity.filter(
        a => /hiring|join our team|we're looking|open position/i.test(a.content)
      );

      if (hiringPosts.length > 0) {
        signals.push({
          type: 'hiring',
          description: 'Company is hiring - potential growth phase',
          date: hiringPosts[0].date,
          relevance: 'high'
        });
      }

      // Update signals in profile
      socialProfile.signals = [...socialProfile.signals, ...signals];
      await socialProfile.save();

      return signals;
    } catch (error) {
      logger.error('Detect buying signals error:', error);
      throw error;
    }
  }

  /**
   * Create lead from social profile
   */
  async createLeadFromProfile(socialProfile) {
    try {
      // Check if lead already exists
      const existingLead = await Lead.findOne({
        $or: [
          { email: socialProfile.enrichmentData?.email },
          { linkedinUrl: socialProfile.profileUrl }
        ]
      });

      if (existingLead) {
        logger.info(`Lead already exists for profile ${socialProfile._id}`);
        socialProfile.lead = existingLead._id;
        await socialProfile.save();
        return existingLead;
      }

      // Extract name
      const nameParts = socialProfile.displayName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Create new lead
      const lead = new Lead({
        firstName,
        lastName,
        email: socialProfile.enrichmentData?.email,
        phone: socialProfile.enrichmentData?.phone,
        company: socialProfile.linkedin?.company || socialProfile.twitter?.bio,
        jobTitle: socialProfile.linkedin?.position || socialProfile.headline,
        location: socialProfile.location,
        linkedinUrl: socialProfile.platform === 'linkedin' ? socialProfile.profileUrl : null,
        twitterHandle: socialProfile.platform === 'twitter' ? socialProfile.username : null,
        source: `social_import_${socialProfile.platform}`,
        status: 'new',
        tags: ['social_import', socialProfile.platform]
      });

      await lead.save();

      // Link social profile to lead
      socialProfile.lead = lead._id;
      await socialProfile.save();

      logger.info(`Created lead from social profile: ${lead._id}`);

      return lead;
    } catch (error) {
      logger.error('Create lead from profile error:', error);
      throw error;
    }
  }

  /**
   * Monitor brand mentions across social platforms
   */
  async monitorBrandMentions(keywords, platforms = ['linkedin', 'twitter']) {
    try {
      const mentions = [];

      for (const platform of platforms) {
        if (platform === 'twitter') {
          const tweets = await this.searchTwitterMentions(keywords);
          mentions.push(...tweets);
        } else if (platform === 'linkedin') {
          const posts = await this.searchLinkedInMentions(keywords);
          mentions.push(...posts);
        }
      }

      return mentions;
    } catch (error) {
      logger.error('Monitor brand mentions error:', error);
      throw error;
    }
  }

  async searchTwitterMentions(keywords) {
    // Mock implementation
    return [
      {
        platform: 'twitter',
        author: '@user1',
        content: `Just started using ${keywords[0]} and it's amazing!`,
        date: new Date(),
        sentiment: 'positive',
        url: 'https://twitter.com/user1/status/123'
      }
    ];
  }

  async searchLinkedInMentions(keywords) {
    // Mock implementation
    return [
      {
        platform: 'linkedin',
        author: 'John Doe',
        content: `Great experience with ${keywords[0]}`,
        date: new Date(),
        sentiment: 'positive',
        url: 'https://linkedin.com/feed/update/123'
      }
    ];
  }

  // Mock data generators

  generateMockLinkedInResults(query) {
    const results = [];
    const positions = ['Sales Director', 'Marketing Manager', 'CEO', 'VP of Engineering', 'CTO'];
    const companies = ['Tech Corp', 'Digital Solutions', 'Innovation Labs', 'Growth Partners'];

    for (let i = 0; i < 10; i++) {
      results.push({
        name: `Person ${i + 1}`,
        headline: `${positions[i % positions.length]} at ${companies[i % companies.length]}`,
        location: 'San Francisco, CA',
        profileUrl: `https://linkedin.com/in/person${i + 1}`,
        connectionDegree: ['2nd', '3rd'][Math.floor(Math.random() * 2)],
        mutualConnections: Math.floor(Math.random() * 50),
        profilePicture: 'https://via.placeholder.com/100'
      });
    }

    return results;
  }

  generateMockTwitterResults(query) {
    const results = [];

    for (let i = 0; i < 10; i++) {
      results.push({
        username: `user${i + 1}`,
        name: `Twitter User ${i + 1}`,
        bio: 'Entrepreneur | Tech Enthusiast',
        followerCount: Math.floor(Math.random() * 10000),
        profileUrl: `https://twitter.com/user${i + 1}`,
        profilePicture: 'https://via.placeholder.com/100',
        verified: Math.random() > 0.8
      });
    }

    return results;
  }

  /**
   * Get social profile insights
   */
  async getProfileInsights(profileId) {
    try {
      const profile = await SocialProfile.findById(profileId);

      if (!profile) {
        throw new Error('Profile not found');
      }

      const engagementScore = profile.calculateEngagementScore();
      const buyingSignals = await this.detectBuyingSignals(profileId);

      return {
        profile,
        engagementScore,
        buyingSignals,
        recommendations: this.generateRecommendations(profile, engagementScore, buyingSignals)
      };
    } catch (error) {
      logger.error('Get profile insights error:', error);
      throw error;
    }
  }

  generateRecommendations(profile, engagementScore, buyingSignals) {
    const recommendations = [];

    if (engagementScore > 70) {
      recommendations.push({
        priority: 'high',
        action: 'Reach out now',
        reason: 'High engagement score indicates active and responsive prospect'
      });
    }

    if (buyingSignals.some(s => s.type === 'job_change')) {
      recommendations.push({
        priority: 'high',
        action: 'Contact within 48 hours',
        reason: 'Recent job change presents opportunity to introduce your solution'
      });
    }

    if (buyingSignals.some(s => s.type === 'hiring')) {
      recommendations.push({
        priority: 'medium',
        action: 'Emphasize scale and growth capabilities',
        reason: 'Company is growing and may need scalable solutions'
      });
    }

    if (profile.engagement?.postFrequency === 'very_active') {
      recommendations.push({
        priority: 'medium',
        action: 'Engage with their content before reaching out',
        reason: 'Very active on social - build rapport through engagement first'
      });
    }

    return recommendations;
  }
}

module.exports = new SocialMediaIntegrationService();
