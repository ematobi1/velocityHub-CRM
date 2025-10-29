const { getAIRouter } = require('../services/ai/AIRouter');
const logger = require('../utils/logger');

/**
 * AI Analytics Controller
 * Provides insights into AI provider usage, costs, and performance
 */

// Get AI usage statistics
exports.getAIUsageStats = async (req, res) => {
  try {
    const aiRouter = getAIRouter();
    const stats = aiRouter.getUsageStats();

    // Calculate cost savings compared to using only OpenAI
    const openaiOnlyCost = (stats.total.tokens / 1000000) * 20; // Assuming average $20 per 1M tokens
    const actualCost = stats.total.cost;
    const savings = openaiOnlyCost - actualCost;
    const savingsPercentage = openaiOnlyCost > 0 ? (savings / openaiOnlyCost) * 100 : 0;

    res.json({
      success: true,
      data: {
        usage: stats,
        costComparison: {
          openaiOnlyCost: parseFloat(openaiOnlyCost.toFixed(2)),
          actualCost: parseFloat(actualCost.toFixed(2)),
          savings: parseFloat(savings.toFixed(2)),
          savingsPercentage: parseFloat(savingsPercentage.toFixed(1))
        },
        breakdown: {
          openai: {
            requests: stats.openai.requests,
            tokens: stats.openai.tokens,
            cost: parseFloat(stats.openai.cost.toFixed(2)),
            percentage: stats.total.requests > 0
              ? parseFloat(((stats.openai.requests / stats.total.requests) * 100).toFixed(1))
              : 0
          },
          claude: {
            requests: stats.claude.requests,
            tokens: stats.claude.tokens,
            cost: parseFloat(stats.claude.cost.toFixed(2)),
            percentage: stats.total.requests > 0
              ? parseFloat(((stats.claude.requests / stats.total.requests) * 100).toFixed(1))
              : 0
          },
          groq: {
            requests: stats.groq.requests,
            tokens: stats.groq.tokens,
            cost: parseFloat(stats.groq.cost.toFixed(2)),
            percentage: stats.total.requests > 0
              ? parseFloat(((stats.groq.requests / stats.total.requests) * 100).toFixed(1))
              : 0
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching AI usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI usage statistics',
      error: error.message
    });
  }
};

// Reset AI usage statistics
exports.resetAIUsageStats = async (req, res) => {
  try {
    const aiRouter = getAIRouter();
    aiRouter.resetUsageStats();

    res.json({
      success: true,
      message: 'AI usage statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting AI usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset AI usage statistics',
      error: error.message
    });
  }
};

// Get available AI providers
exports.getAvailableProviders = async (req, res) => {
  try {
    const aiRouter = getAIRouter();
    const providers = aiRouter.getAvailableProviders();

    res.json({
      success: true,
      data: {
        providers,
        strategy: process.env.AI_PROVIDER_STRATEGY || 'auto',
        priority: process.env.AI_PROVIDER_PRIORITY?.split(',') || ['groq', 'claude', 'openai']
      }
    });
  } catch (error) {
    logger.error('Error fetching available providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available providers',
      error: error.message
    });
  }
};

// Health check for all AI providers
exports.healthCheck = async (req, res) => {
  try {
    const aiRouter = getAIRouter();
    const health = await aiRouter.healthCheck();

    const allHealthy = Object.values(health).every(h => h.status === 'healthy');

    res.json({
      success: true,
      data: {
        overallStatus: allHealthy ? 'healthy' : 'degraded',
        providers: health
      }
    });
  } catch (error) {
    logger.error('Error performing health check:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};

// Get AI provider recommendations for optimization
exports.getOptimizationRecommendations = async (req, res) => {
  try {
    const aiRouter = getAIRouter();
    const stats = aiRouter.getUsageStats();

    const recommendations = [];

    // Check if Groq is underutilized
    if (stats.groq.requests < stats.total.requests * 0.3) {
      recommendations.push({
        type: 'cost_optimization',
        severity: 'medium',
        title: 'Groq Underutilized',
        description: 'Groq has a generous free tier and is 10x faster. Consider routing more simple tasks to Groq.',
        potentialSavings: parseFloat((stats.total.cost * 0.3).toFixed(2)),
        action: 'Review AI_PROVIDER_PRIORITY configuration'
      });
    }

    // Check if OpenAI is overused for simple tasks
    if (stats.openai.cost > stats.total.cost * 0.5 && stats.groq.requests > 0) {
      recommendations.push({
        type: 'cost_optimization',
        severity: 'high',
        title: 'OpenAI Overuse Detected',
        description: 'OpenAI is being used for more than 50% of requests. Consider routing simple tasks to Groq or Claude.',
        potentialSavings: parseFloat((stats.openai.cost * 0.4).toFixed(2)),
        action: 'Review task routing configuration in AIRouter.js'
      });
    }

    // Check if Claude is available but not used
    const providers = aiRouter.getAvailableProviders();
    const claudeAvailable = providers.some(p => p.name === 'claude');
    if (claudeAvailable && stats.claude.requests === 0) {
      recommendations.push({
        type: 'quality_optimization',
        severity: 'low',
        title: 'Claude Not Utilized',
        description: 'Claude is excellent for conversational AI and is 70% cheaper than GPT-4. Consider using it for chatbot and email writing.',
        potentialSavings: 0,
        action: 'Ensure Claude is configured in task routing'
      });
    }

    res.json({
      success: true,
      data: {
        recommendations,
        currentCost: parseFloat(stats.total.cost.toFixed(2)),
        potentialTotalSavings: parseFloat(
          recommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0).toFixed(2)
        )
      }
    });
  } catch (error) {
    logger.error('Error generating optimization recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
};
