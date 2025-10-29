const Anthropic = require('@anthropic-ai/sdk');
const AIProviderBase = require('./AIProviderBase');
const logger = require('../../utils/logger');

/**
 * Claude (Anthropic) Provider Implementation
 * Best for: Conversations, chatbot, email writing, proposals
 */
class ClaudeProvider extends AIProviderBase {
  constructor(config = {}) {
    super(config);
    this.providerName = 'claude';

    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }

    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
  }

  isAvailable() {
    return !!this.client && !!process.env.ANTHROPIC_API_KEY;
  }

  getCapabilities() {
    return {
      chat: true,
      streaming: true,
      jsonMode: false, // Claude doesn't have strict JSON mode, but can output JSON
      functionCalling: true,
      vision: true
    };
  }

  getPricing() {
    return {
      input: 3.00,  // $3 per 1M tokens (Claude Sonnet)
      output: 15.00, // $15 per 1M tokens
      currency: 'USD'
    };
  }

  /**
   * Convert OpenAI-style messages to Claude format
   * Claude requires system message separate from messages array
   */
  convertMessages(messages) {
    let systemMessage = '';
    const claudeMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage += msg.content + '\n';
      } else {
        claudeMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    return { system: systemMessage.trim(), messages: claudeMessages };
  }

  async chatComplete(messages, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Claude provider is not available');
      }

      const { system, messages: claudeMessages } = this.convertMessages(messages);

      const requestOptions = {
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature ?? 0.7,
        messages: claudeMessages
      };

      if (system) {
        requestOptions.system = system;
      }

      const response = await this.client.messages.create(requestOptions);

      return this.normalizeResponse(response);
    } catch (error) {
      logger.error(`Claude chat error: ${error.message}`);
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
        throw new Error('Claude provider is not available');
      }

      const { system, messages: claudeMessages } = this.convertMessages(messages);

      const requestOptions = {
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature ?? 0.7,
        messages: claudeMessages,
        stream: true
      };

      if (system) {
        requestOptions.system = system;
      }

      const stream = await this.client.messages.create(requestOptions);

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error) {
      logger.error(`Claude stream error: ${error.message}`);
      throw error;
    }
  }

  normalizeResponse(rawResponse) {
    const content = rawResponse.content[0];
    const text = content?.type === 'text' ? content.text : '';

    return {
      text,
      usage: {
        inputTokens: rawResponse.usage?.input_tokens || 0,
        outputTokens: rawResponse.usage?.output_tokens || 0,
        totalTokens: (rawResponse.usage?.input_tokens || 0) + (rawResponse.usage?.output_tokens || 0)
      },
      model: rawResponse.model,
      provider: this.providerName,
      finishReason: rawResponse.stop_reason || 'complete',
      rawResponse
    };
  }
}

module.exports = ClaudeProvider;
