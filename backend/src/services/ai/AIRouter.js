const OpenAIProvider = require('./OpenAIProvider');
const ClaudeProvider = require('./ClaudeProvider');
const GroqProvider = require('./GroqProvider');
const logger = require('../../utils/logger');

/**
 * AI Router - Intelligent routing and fallback system
 * Selects the best AI provider for each task
 */
class AIRouter {
  constructor() {
    // Initialize all providers
    this.providers = {
      openai: new OpenAIProvider(),
      claude: new ClaudeProvider(),
      groq: new GroqProvider()
    };

    // Task-to-provider mapping based on optimal performance/cost
    this.taskProviderMap = {
      // Conversational tasks - Claude excels here
      'chatbot': ['claude', 'openai'],
      'email_writing': ['claude', 'openai'],
      'conversation': ['claude', 'openai'],

      // Fast, simple tasks - Groq for speed and cost
      'sentiment_analysis': ['groq', 'openai'],
      'lead_scoring': ['groq', 'claude', 'openai'],
      'voice_ai_analysis': ['groq', 'openai'],
      'classification': ['groq', 'openai'],

      // Complex reasoning - OpenAI GPT-4 for accuracy
      'revenue_prediction': ['openai', 'claude'],
      'proposal_generation': ['claude', 'openai'],
      'complex_analysis': ['openai', 'claude'],

      // Default fallback order
      'default': ['groq', 'claude', 'openai']
    };

    // Usage tracking
    this.usageStats = {
      openai: { requests: 0, tokens: 0, cost: 0 },
      claude: { requests: 0, tokens: 0, cost: 0 },
      groq: { requests: 0, tokens: 0, cost: 0 }
    };
  }

  /**
   * Get the best provider for a specific task
   * @param {String} taskType - Type of AI task
   * @returns {Object} Provider instance
   */
  getProviderForTask(taskType) {
    const strategy = process.env.AI_PROVIDER_STRATEGY || 'auto';

    // Manual override - use specific provider
    if (strategy !== 'auto' && this.providers[strategy]) {
      const provider = this.providers[strategy];
      if (provider.isAvailable()) {
        return provider;
      }
    }

    // Auto mode - intelligent routing
    const preferredProviders = this.taskProviderMap[taskType] || this.taskProviderMap.default;

    for (const providerName of preferredProviders) {
      const provider = this.providers[providerName];
      if (provider && provider.isAvailable()) {
        return provider;
      }
    }

    // Final fallback - try any available provider
    for (const provider of Object.values(this.providers)) {
      if (provider.isAvailable()) {
        logger.warn(`No preferred provider available for ${taskType}, using ${provider.getName()}`);
        return provider;
      }
    }

    throw new Error('No AI providers available');
  }

  /**
   * Execute chat completion with automatic fallback
   * @param {Array} messages - Chat messages
   * @param {Object} options - Completion options
   * @param {String} taskType - Type of task for routing
   * @returns {Promise<Object>} Normalized response
   */
  async chatComplete(messages, options = {}, taskType = 'default') {
    const taskProviders = this.taskProviderMap[taskType] || this.taskProviderMap.default;
    const errors = [];

    for (const providerName of taskProviders) {
      const provider = this.providers[providerName];

      if (!provider || !provider.isAvailable()) {
        continue;
      }

      try {
        logger.info(`Attempting AI request with ${providerName} for task: ${taskType}`);

        const startTime = Date.now();
        const response = await provider.chatComplete(messages, options);
        const duration = Date.now() - startTime;

        // Track usage
        this.trackUsage(providerName, response, duration);

        logger.info(`Successfully completed AI request with ${providerName} (${duration}ms)`);
        return response;

      } catch (error) {
        logger.error(`${providerName} failed: ${error.message}`);
        errors.push({ provider: providerName, error: error.message });

        // Continue to next provider in fallback chain
        continue;
      }
    }

    // All providers failed
    const errorMessage = `All AI providers failed for task ${taskType}: ${JSON.stringify(errors)}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Execute text completion with automatic fallback
   */
  async textComplete(prompt, options = {}, taskType = 'default') {
    const messages = [{ role: 'user', content: prompt }];
    return this.chatComplete(messages, options, taskType);
  }

  /**
   * Stream chat completion (uses best provider, no fallback for streams)
   */
  async *streamChatComplete(messages, options = {}, taskType = 'default') {
    const provider = this.getProviderForTask(taskType);

    if (!provider.getCapabilities().streaming) {
      throw new Error(`Provider ${provider.getName()} does not support streaming`);
    }

    yield* provider.streamChatComplete(messages, options);
  }

  /**
   * Track usage statistics and costs
   */
  trackUsage(providerName, response, duration) {
    const provider = this.providers[providerName];
    const pricing = provider.getPricing();
    const usage = response.usage;

    // Calculate cost
    const inputCost = (usage.inputTokens / 1000000) * pricing.input;
    const outputCost = (usage.outputTokens / 1000000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Update stats
    this.usageStats[providerName].requests++;
    this.usageStats[providerName].tokens += usage.totalTokens;
    this.usageStats[providerName].cost += totalCost;

    logger.info(`${providerName} usage - Tokens: ${usage.totalTokens}, Cost: $${totalCost.toFixed(4)}, Duration: ${duration}ms`);
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      total: {
        requests: Object.values(this.usageStats).reduce((sum, stat) => sum + stat.requests, 0),
        tokens: Object.values(this.usageStats).reduce((sum, stat) => sum + stat.tokens, 0),
        cost: Object.values(this.usageStats).reduce((sum, stat) => sum + stat.cost, 0)
      }
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    for (const provider in this.usageStats) {
      this.usageStats[provider] = { requests: 0, tokens: 0, cost: 0 };
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.entries(this.providers)
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name, provider]) => ({
        name,
        capabilities: provider.getCapabilities(),
        pricing: provider.getPricing()
      }));
  }

  /**
   * Health check for all providers
   */
  async healthCheck() {
    const results = {};

    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const isAvailable = provider.isAvailable();

        if (isAvailable) {
          // Test with a simple request
          await provider.chatComplete(
            [{ role: 'user', content: 'Say "OK"' }],
            { maxTokens: 10, temperature: 0 }
          );
          results[name] = { status: 'healthy', available: true };
        } else {
          results[name] = { status: 'unavailable', available: false, reason: 'API key not configured' };
        }
      } catch (error) {
        results[name] = { status: 'error', available: false, error: error.message };
      }
    }

    return results;
  }
}

// Singleton instance
let routerInstance = null;

function getAIRouter() {
  if (!routerInstance) {
    routerInstance = new AIRouter();
  }
  return routerInstance;
}

module.exports = { AIRouter, getAIRouter };
