const { getAIRouter } = require('../services/ai/AIRouter');
const tf = require('@tensorflow/tfjs-node');
const Deal = require('../models/Deal');
const logger = require('../utils/logger');

// Predictive Revenue Intelligence AI (CORE DIFFERENTIATOR)
// Now powered by multi-provider AI with intelligent routing
class RevenueIntelligenceAI {
  constructor() {
    this.aiRouter = getAIRouter();
    this.model = null; // TensorFlow model for predictions
  }

  // Analyze deal and generate AI insights
  async analyzeDeal(dealId) {
    try {
      const deal = await Deal.findById(dealId)
        .populate('contact')
        .populate('company')
        .populate('owner');

      if (!deal) {
        throw new Error('Deal not found');
      }

      logger.info(`Analyzing deal: ${deal.name}`);

      // Run all analyses in parallel
      const [
        predictedProbability,
        riskFactors,
        positiveSignals,
        recommendedActions,
        similarDeals,
        engagementScore,
        forecastedRevenue
      ] = await Promise.all([
        this.predictCloseProbability(deal),
        this.identifyRiskFactors(deal),
        this.identifyPositiveSignals(deal),
        this.generateRecommendedActions(deal),
        this.analyzeSimilarDeals(deal),
        this.calculateEngagementScore(deal),
        this.forecastRevenue(deal)
      ]);

      // Update deal with AI insights
      deal.aiInsights = {
        predictedProbability: predictedProbability.probability,
        confidence: predictedProbability.confidence,
        forecastedRevenue,
        expectedDaysToClose: predictedProbability.daysToClose,
        riskFactors,
        positiveSignals,
        recommendedActions,
        similarDeals,
        engagementScore,
        lastAnalyzed: new Date(),
        modelVersion: '1.0.0'
      };

      await deal.save();

      logger.info(`Deal analysis completed: ${deal.name} - ${predictedProbability.probability}% probability`);

      return deal.aiInsights;
    } catch (error) {
      logger.error(`Error analyzing deal: ${error.message}`);
      throw error;
    }
  }

  // Predict close probability using AI
  async predictCloseProbability(deal) {
    try {
      // Prepare features for ML model
      const features = this.extractDealFeatures(deal);

      // Use OpenAI for sophisticated analysis
      const prompt = `Analyze this sales deal and predict its close probability:

Deal Details:
- Value: $${deal.value}
- Stage: ${deal.stage}
- Days in stage: ${deal.metrics?.daysInStage || 0}
- Close date: ${deal.closeDate}
- Probability: ${deal.probability}%
- Emails sent: ${deal.metrics?.emailsSent || 0}
- Emails opened: ${deal.metrics?.emailsOpened || 0}
- Calls made: ${deal.metrics?.callsMade || 0}
- Meetings held: ${deal.metrics?.meetingsHeld || 0}
- Proposals sent: ${deal.metrics?.proposalsSent || 0}
- Days since last contact: ${deal.metrics?.daysSinceLastContact || 0}

Contact Info:
- Job title: ${deal.contact?.jobTitle || 'Unknown'}
- Decision maker: ${deal.decisionMakers?.length || 0}
- Overall sentiment: ${deal.decisionMakers?.[0]?.sentiment || 'unknown'}

Based on these factors, provide:
1. A realistic close probability (0-100%)
2. Your confidence in this prediction (0-100%)
3. Expected days until close
4. Brief reasoning

Format your response as JSON:
{
  "probability": <number>,
  "confidence": <number>,
  "daysToClose": <number>,
  "reasoning": "<string>"
}`;

      // Use OpenAI for complex revenue prediction (best for reasoning)
      const response = await this.aiRouter.chatComplete(
        [
          {
            role: 'system',
            content: 'You are a sales analytics AI that predicts deal outcomes with high accuracy. Base predictions on real sales data patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent predictions
          jsonMode: true,
          maxTokens: 1000
        },
        'revenue_prediction' // Task type - will use OpenAI for complex reasoning
      );

      const prediction = JSON.parse(response.text);

      return {
        probability: Math.min(100, Math.max(0, prediction.probability)),
        confidence: Math.min(100, Math.max(0, prediction.confidence)),
        daysToClose: prediction.daysToClose,
        reasoning: prediction.reasoning
      };
    } catch (error) {
      logger.error(`Error predicting close probability: ${error.message}`);
      // Fallback to simple calculation
      return {
        probability: deal.probability,
        confidence: 50,
        daysToClose: 30,
        reasoning: 'Using fallback prediction'
      };
    }
  }

  // Identify risk factors
  async identifyRiskFactors(deal) {
    const risks = [];

    // Low engagement
    if (deal.metrics?.daysSinceLastContact > 7) {
      risks.push({
        factor: 'Low Contact Frequency',
        severity: deal.metrics.daysSinceLastContact > 14 ? 'high' : 'medium',
        description: `No contact in ${deal.metrics.daysSinceLastContact} days`
      });
    }

    // Stalled in stage
    if (deal.metrics?.daysInStage > 30) {
      risks.push({
        factor: 'Deal Stalled',
        severity: 'high',
        description: `Stuck in ${deal.stage} stage for ${deal.metrics.daysInStage} days`
      });
    }

    // Low email engagement
    const openRate = deal.metrics?.emailsSent > 0
      ? (deal.metrics.emailsOpened / deal.metrics.emailsSent) * 100
      : 0;

    if (deal.metrics?.emailsSent > 3 && openRate < 20) {
      risks.push({
        factor: 'Low Email Engagement',
        severity: 'medium',
        description: `Only ${openRate.toFixed(0)}% open rate`
      });
    }

    // No meetings
    if (deal.stage !== 'prospecting' && deal.metrics?.meetingsHeld === 0) {
      risks.push({
        factor: 'No Meetings Scheduled',
        severity: 'critical',
        description: 'No meetings held yet'
      });
    }

    // Approaching close date
    const daysUntilClose = Math.floor((new Date(deal.closeDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilClose < 7 && deal.stage !== 'negotiation') {
      risks.push({
        factor: 'Close Date Approaching',
        severity: 'high',
        description: `Only ${daysUntilClose} days until close date but still in ${deal.stage}`
      });
    }

    // Use AI for deeper analysis
    if (risks.length === 0) {
      return risks;
    }

    return risks;
  }

  // Identify positive signals
  async identifyPositiveSignals(deal) {
    const signals = [];

    // High engagement
    const openRate = deal.metrics?.emailsSent > 0
      ? (deal.metrics.emailsOpened / deal.metrics.emailsSent) * 100
      : 0;

    if (openRate > 60) {
      signals.push({
        signal: 'High Email Engagement',
        strength: 'strong',
        description: `${openRate.toFixed(0)}% open rate`
      });
    }

    // Multiple meetings
    if (deal.metrics?.meetingsHeld >= 2) {
      signals.push({
        signal: 'Multiple Meetings',
        strength: 'strong',
        description: `${deal.metrics.meetingsHeld} meetings held`
      });
    }

    // Proposal viewed
    if (deal.proposal?.status === 'viewed' || deal.proposal?.status === 'accepted') {
      signals.push({
        signal: 'Proposal Engagement',
        strength: deal.proposal.status === 'accepted' ? 'strong' : 'moderate',
        description: `Proposal ${deal.proposal.status}`
      });
    }

    // Decision maker engaged
    const champions = deal.decisionMakers?.filter(dm => dm.sentiment === 'champion');
    if (champions && champions.length > 0) {
      signals.push({
        signal: 'Internal Champion',
        strength: 'strong',
        description: `${champions.length} champion(s) identified`
      });
    }

    // Frequent contact
    if (deal.metrics?.daysSinceLastContact < 2) {
      signals.push({
        signal: 'Recent Contact',
        strength: 'moderate',
        description: 'Contact within last 48 hours'
      });
    }

    return signals;
  }

  // Generate recommended actions
  async generateRecommendedActions(deal) {
    try {
      const prompt = `As a sales coach, analyze this deal and suggest 3-5 specific next actions:

Deal: ${deal.name}
Stage: ${deal.stage}
Value: $${deal.value}
Days since last contact: ${deal.metrics?.daysSinceLastContact || 0}
Emails sent: ${deal.metrics?.emailsSent || 0}
Meetings held: ${deal.metrics?.meetingsHeld || 0}
Proposal status: ${deal.proposal?.status || 'not sent'}

Provide actionable recommendations with priority and estimated impact.

Format as JSON array:
[{
  "action": "<specific action>",
  "priority": "low|medium|high|urgent",
  "reason": "<why this action>",
  "estimatedImpact": "<e.g., +15% close probability>"
}]`;

      // Use Claude for coaching recommendations (excellent at conversational advice)
      const response = await this.aiRouter.chatComplete(
        [
          {
            role: 'system',
            content: 'You are an expert sales coach providing actionable recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.7,
          jsonMode: true,
          maxTokens: 1000
        },
        'proposal_generation' // Task type - will use Claude for recommendations
      );

      const result = JSON.parse(response.text);
      return result.actions || [];
    } catch (error) {
      logger.error(`Error generating recommendations: ${error.message}`);
      return [];
    }
  }

  // Analyze similar deals
  async analyzeSimilarDeals(deal) {
    try {
      // Find similar deals (same industry, value range, stage)
      const similarDeals = await Deal.find({
        _id: { $ne: deal._id },
        value: {
          $gte: deal.value * 0.7,
          $lte: deal.value * 1.3
        },
        stage: { $in: ['closed_won', 'closed_lost'] }
      }).limit(50);

      const won = similarDeals.filter(d => d.stage === 'closed_won');
      const lost = similarDeals.filter(d => d.stage === 'closed_lost');

      // Calculate metrics
      const avgDaysToClose = won.length > 0
        ? won.reduce((sum, d) => {
          const days = Math.floor((d.wonAt - d.createdAt) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / won.length
        : 0;

      const avgValue = won.length > 0
        ? won.reduce((sum, d) => sum + d.value, 0) / won.length
        : 0;

      return {
        wonCount: won.length,
        lostCount: lost.length,
        avgDaysToClose: Math.round(avgDaysToClose),
        avgValue: Math.round(avgValue)
      };
    } catch (error) {
      logger.error(`Error analyzing similar deals: ${error.message}`);
      return {
        wonCount: 0,
        lostCount: 0,
        avgDaysToClose: 0,
        avgValue: 0
      };
    }
  }

  // Calculate engagement score
  calculateEngagementScore(deal) {
    let score = 0;

    // Email engagement (30 points)
    const openRate = deal.metrics?.emailsSent > 0
      ? (deal.metrics.emailsOpened / deal.metrics.emailsSent) * 100
      : 0;
    score += Math.min(30, (openRate / 100) * 30);

    // Meeting activity (25 points)
    score += Math.min(25, (deal.metrics?.meetingsHeld || 0) * 8);

    // Proposal engagement (20 points)
    if (deal.proposal?.status === 'viewed') score += 10;
    if (deal.proposal?.status === 'accepted') score += 20;

    // Recent contact (15 points)
    const daysSince = deal.metrics?.daysSinceLastContact || 999;
    if (daysSince < 2) score += 15;
    else if (daysSince < 5) score += 10;
    else if (daysSince < 10) score += 5;

    // Call activity (10 points)
    score += Math.min(10, (deal.metrics?.callsMade || 0) * 2);

    return Math.min(100, Math.round(score));
  }

  // Forecast revenue
  async forecastRevenue(deal) {
    const probability = deal.aiInsights?.predictedProbability || deal.probability;

    return {
      low: Math.round(deal.value * (probability / 100) * 0.7),
      expected: Math.round(deal.value * (probability / 100)),
      high: Math.round(deal.value * (probability / 100) * 1.3)
    };
  }

  // Extract features for ML model
  extractDealFeatures(deal) {
    return {
      value: deal.value,
      daysInStage: deal.metrics?.daysInStage || 0,
      emailsSent: deal.metrics?.emailsSent || 0,
      emailsOpened: deal.metrics?.emailsOpened || 0,
      callsMade: deal.metrics?.callsMade || 0,
      meetingsHeld: deal.metrics?.meetingsHeld || 0,
      proposalsSent: deal.metrics?.proposalsSent || 0,
      daysSinceLastContact: deal.metrics?.daysSinceLastContact || 0,
      hasDecisionMaker: (deal.decisionMakers?.length || 0) > 0 ? 1 : 0,
      hasChampion: (deal.decisionMakers?.filter(dm => dm.sentiment === 'champion').length || 0) > 0 ? 1 : 0
    };
  }

  // Batch analyze all active deals
  async analyzeAllActiveDeals() {
    try {
      const activeDeals = await Deal.find({
        stage: { $nin: ['closed_won', 'closed_lost'] },
        isArchived: false
      }).limit(100);

      logger.info(`Analyzing ${activeDeals.length} active deals...`);

      const results = [];
      for (const deal of activeDeals) {
        try {
          const insights = await this.analyzeDeal(deal._id);
          results.push({ dealId: deal._id, success: true, insights });
        } catch (error) {
          results.push({ dealId: deal._id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error in batch analysis: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new RevenueIntelligenceAI();
