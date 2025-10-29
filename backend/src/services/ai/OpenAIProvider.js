const OpenAI = require('openai');
const AIProviderBase = require('./AIProviderBase');
const logger = require('../../utils/logger');

/**
 * OpenAI Provider Implementation
 * Best for: Complex reasoning, revenue predictions, high-stakes proposals
 */
class OpenAIProvider extends AIProviderBase {
  constructor(config = {}) {
    super(config);
    this.providerName = 'openai';

    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    this.defaultModel = config.model || 'gpt-4-turbo-preview';
  }

  isAvailable() {
    return !!this.client && !!process.env.OPENAI_API_KEY;
  }

  getCapabilities() {
    return {
      chat: true,
      streaming: true,
      jsonMode: true,
      functionCalling: true,
      vision: true
    };
  }

  getPricing() {
    return {
      input: 10.00,  // $10 per 1M tokens
      output: 30.00, // $30 per 1M tokens
      currency: 'USD'
    };
  }

  async chatComplete(messages, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI provider is not available');
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
      logger.error(`OpenAI chat error: ${error.message}`);
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
        throw new Error('OpenAI provider is not available');
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
      logger.error(`OpenAI stream error: ${error.message}`);
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

module.exports = OpenAIProvider;
