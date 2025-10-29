const Groq = require('groq-sdk');
const AIProviderBase = require('./AIProviderBase');
const logger = require('../../utils/logger');

/**
 * Groq Provider Implementation
 * Best for: Fast real-time operations (voice AI, sentiment, lead scoring)
 * Advantage: 10x faster than OpenAI, generous free tier (14,400 requests/day)
 */
class GroqProvider extends AIProviderBase {
  constructor(config = {}) {
    super(config);
    this.providerName = 'groq';

    if (process.env.GROQ_API_KEY) {
      this.client = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });
    }

    // Groq uses open-source models hosted on their fast infrastructure
    this.defaultModel = config.model || 'llama-3.3-70b-versatile';
  }

  isAvailable() {
    return !!this.client && !!process.env.GROQ_API_KEY;
  }

  getCapabilities() {
    return {
      chat: true,
      streaming: true,
      jsonMode: true,
      functionCalling: true,
      vision: false // Groq doesn't support vision yet
    };
  }

  getPricing() {
    return {
      input: 0.59,  // $0.59 per 1M tokens (extremely cheap!)
      output: 0.79, // $0.79 per 1M tokens
      currency: 'USD',
      freeTier: {
        requestsPerDay: 14400,
        tokensPerMinute: 30000
      }
    };
  }

  async chatComplete(messages, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Groq provider is not available');
      }

      const requestOptions = {
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 2000,
        ...options.additionalOptions
      };

      // Add JSON mode if requested
      if (options.jsonMode) {
        requestOptions.response_format = { type: 'json_object' };
      }

      const response = await this.client.chat.completions.create(requestOptions);

      return this.normalizeResponse(response);
    } catch (error) {
      logger.error(`Groq chat error: ${error.message}`);
      throw error;
    }
  }

  async textComplete(prompt, options = {}) {
    // Convert to chat format
    const messages = [
      { role: 'user', content: prompt }
    ];
    return this.chatComplete(messages, options);
  }

  async *streamChatComplete(messages, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Groq provider is not available');
      }

      const stream = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true,
        ...options.additionalOptions
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error(`Groq stream error: ${error.message}`);
      throw error;
    }
  }

  normalizeResponse(rawResponse) {
    const choice = rawResponse.choices[0];
    const message = choice.message || {};

    return {
      text: message.content || '',
      usage: {
        inputTokens: rawResponse.usage?.prompt_tokens || 0,
        outputTokens: rawResponse.usage?.completion_tokens || 0,
        totalTokens: rawResponse.usage?.total_tokens || 0
      },
      model: rawResponse.model,
      provider: this.providerName,
      finishReason: choice.finish_reason || 'complete',
      rawResponse
    };
  }
}

module.exports = GroqProvider;
