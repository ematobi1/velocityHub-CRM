/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
class AIProviderBase {
  constructor(config) {
    this.config = config;
    this.providerName = 'base';
  }

  /**
   * Complete a chat conversation
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Model options (temperature, maxTokens, etc)
   * @returns {Promise<Object>} Response with text, usage, and metadata
   */
  async chatComplete(messages, options = {}) {
    throw new Error('chatComplete method must be implemented by provider');
  }

  /**
   * Generate text completion
   * @param {String} prompt - Text prompt
   * @param {Object} options - Model options
   * @returns {Promise<Object>} Response with text, usage, and metadata
   */
  async textComplete(prompt, options = {}) {
    throw new Error('textComplete method must be implemented by provider');
  }

  /**
   * Stream chat completion
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Model options
   * @returns {AsyncGenerator} Stream of text chunks
   */
  async *streamChatComplete(messages, options = {}) {
    throw new Error('streamChatComplete method must be implemented by provider');
  }

  /**
   * Check if provider is available and configured
   * @returns {Boolean}
   */
  isAvailable() {
    return false;
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      chat: false,
      streaming: false,
      jsonMode: false,
      functionCalling: false,
      vision: false
    };
  }

  /**
   * Get provider pricing info (per 1M tokens)
   * @returns {Object} Pricing information
   */
  getPricing() {
    return {
      input: 0,
      output: 0,
      currency: 'USD'
    };
  }

  /**
   * Get provider name
   * @returns {String}
   */
  getName() {
    return this.providerName;
  }

  /**
   * Normalize response format across providers
   * @param {Object} rawResponse - Provider-specific response
   * @returns {Object} Normalized response
   */
  normalizeResponse(rawResponse) {
    return {
      text: '',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      },
      model: '',
      provider: this.providerName,
      finishReason: 'complete'
    };
  }
}

module.exports = AIProviderBase;
