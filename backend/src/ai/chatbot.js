const { getAIRouter } = require('../services/ai/AIRouter');
const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');

// AI Chatbot Service - 24/7 Assistance (KEY FEATURE)
// Now powered by multi-provider AI with intelligent routing
class ChatbotAI {
  constructor() {
    this.aiRouter = getAIRouter();

    // Knowledge base for VelocityHub CRM
    this.knowledge = {
      features: [
        'Lead management with AI scoring',
        'Deal pipeline with predictive intelligence',
        'Voice AI for sales calls with coaching',
        'WhatsApp & SMS messaging',
        'AI-powered email sequences',
        'Smart proposals with e-signatures',
        'Verified lead purchasing',
        '24/7 AI chatbot support',
        'Revenue forecasting',
        'Real-time analytics'
      ],
      pricing: {
        free: {
          name: 'Velocity Free',
          price: '$0/month',
          features: [
            '1,000 contacts',
            '1 user',
            'Basic pipeline',
            'Email integration',
            'Basic reports'
          ]
        },
        pro: {
          name: 'Velocity Pro',
          price: '$49/user/month',
          features: [
            'Unlimited contacts',
            'Predictive AI (revenue forecasting)',
            'Voice AI (5 hours/month)',
            'WhatsApp/SMS (500 msgs/month)',
            'AI email writer (100/month)',
            'Smart proposals (10/month)'
          ]
        },
        enterprise: {
          name: 'Velocity Enterprise',
          price: '$99/user/month',
          features: [
            'Everything unlimited',
            'API access',
            'Custom integrations',
            'White-label options',
            'Dedicated support'
          ]
        }
      },
      leadPurchasing: {
        description: 'Purchase verified leads from trusted sources (Apollo, ZoomInfo)',
        pricing: 'Starting at $2 per lead',
        quality: 'Email verified, phone verified, enriched data'
      }
    };
  }

  // Process user message and generate response
  async processMessage(sessionId, userMessage) {
    try {
      // Get or create session
      let session = await ChatSession.findOne({ sessionId });

      if (!session) {
        session = new ChatSession({
          sessionId,
          status: 'ai_only',
          handler: { type: 'ai' }
        });
      }

      // Add user message
      session.addMessage({
        sender: {
          type: 'user',
          name: session.user?.name || 'User'
        },
        content: {
          text: userMessage
        }
      });

      // Analyze intent and sentiment
      const analysis = await this.analyzeMessage(userMessage, session);

      // Update AI context
      session.aiContext = {
        ...session.aiContext,
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        aiConfidence: analysis.confidence
      };

      // Check if should transfer to human agent
      if (analysis.confidence.canHandle === false) {
        // AI cannot handle - suggest transfer
        const transferMessage = "I understand you need help with something complex. Let me connect you with a live agent who can assist you better. Would you like me to transfer you?";

        session.addMessage({
          sender: {
            type: 'ai',
            name: 'VelocityBot'
          },
          content: {
            text: transferMessage,
            structured: {
              type: 'quick_replies',
              data: {
                options: [
                  { label: 'Yes, transfer me', value: 'transfer_yes' },
                  { label: 'No, continue with AI', value: 'transfer_no' }
                ]
              }
            }
          }
        });

        await session.save();

        return {
          message: transferMessage,
          suggestTransfer: true,
          sessionId
        };
      }

      // Generate AI response
      const aiResponse = await this.generateResponse(userMessage, session, analysis);

      // Add AI response to session
      session.addMessage({
        sender: {
          type: 'ai',
          name: 'VelocityBot'
        },
        content: {
          text: aiResponse.text
        },
        ai: {
          model: aiResponse.model || 'multi-provider-ai',
          provider: aiResponse.provider || 'auto',
          confidence: analysis.confidence.overall,
          intent: analysis.intent.primary,
          suggestedActions: aiResponse.suggestedActions
        }
      });

      await session.save();

      return {
        message: aiResponse.text,
        suggestTransfer: false,
        confidence: analysis.confidence.overall,
        sessionId
      };
    } catch (error) {
      logger.error(`Chatbot error: ${error.message}`);
      throw error;
    }
  }

  // Analyze message intent and sentiment
  async analyzeMessage(message, session) {
    try {
      const prompt = `Analyze this user message in a CRM support context:

Message: "${message}"

Previous context: ${session.messages.length} messages exchanged

Determine:
1. Primary intent (what does the user want?)
2. Sentiment (how does the user feel?)
3. Can AI handle this or needs human agent?
4. Urgency level

Respond in JSON:
{
  "intent": {
    "primary": "<intent>",
    "confidence": <0-100>
  },
  "sentiment": {
    "current": "very_negative|negative|neutral|positive|very_positive",
    "score": <-100 to 100>
  },
  "confidence": {
    "overall": <0-100>,
    "canHandle": <boolean>,
    "reasonsForEscalation": ["<reason>"]
  },
  "urgency": "low|medium|high|urgent"
}`;

      // Use Groq for fast sentiment analysis (10x faster + free tier)
      const response = await this.aiRouter.chatComplete(
        [
          {
            role: 'system',
            content: 'You are an AI that analyzes customer support messages.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.3,
          jsonMode: true,
          maxTokens: 500
        },
        'sentiment_analysis' // Task type for routing
      );

      return JSON.parse(response.text);
    } catch (error) {
      logger.error(`Error analyzing message: ${error.message}`);
      // Fallback
      return {
        intent: { primary: 'general_inquiry', confidence: 50 },
        sentiment: { current: 'neutral', score: 0 },
        confidence: { overall: 50, canHandle: true, reasonsForEscalation: [] },
        urgency: 'medium'
      };
    }
  }

  // Generate AI response
  async generateResponse(message, session, analysis) {
    try {
      // Build conversation history
      const conversationHistory = session.messages
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.sender.type === 'user' ? 'user' : 'assistant',
          content: msg.content.text
        }));

      // System prompt with knowledge base
      const systemPrompt = `You are VelocityBot, the AI assistant for VelocityHub CRM. You help users with:

KEY FEATURES:
${this.knowledge.features.map(f => `- ${f}`).join('\n')}

PRICING TIERS:
- ${this.knowledge.pricing.free.name}: ${this.knowledge.pricing.free.price}
  ${this.knowledge.pricing.free.features.join(', ')}

- ${this.knowledge.pricing.pro.name}: ${this.knowledge.pricing.pro.price}
  ${this.knowledge.pricing.pro.features.join(', ')}

- ${this.knowledge.pricing.enterprise.name}: ${this.knowledge.pricing.enterprise.price}
  ${this.knowledge.pricing.enterprise.features.join(', ')}

LEAD PURCHASING:
${this.knowledge.leadPurchasing.description}
Pricing: ${this.knowledge.leadPurchasing.pricing}
Quality: ${this.knowledge.leadPurchasing.quality}

GUIDELINES:
- Be helpful, friendly, and concise
- Provide specific, actionable answers
- If you don't know something, admit it and offer to connect them with a human agent
- Focus on solving the user's problem
- Suggest relevant features they might not know about

Current conversation intent: ${analysis.intent.primary}
User sentiment: ${analysis.sentiment.current}`;

      // Use Claude for superior conversational AI (70% cheaper + better quality)
      const response = await this.aiRouter.chatComplete(
        [
          {
            role: 'system',
            content: systemPrompt
          },
          ...conversationHistory,
          {
            role: 'user',
            content: message
          }
        ],
        {
          temperature: 0.7,
          maxTokens: 500
        },
        'chatbot' // Task type for routing - will use Claude
      );

      const responseText = response.text;

      // Extract suggested actions
      const suggestedActions = this.extractSuggestedActions(responseText, analysis);

      return {
        text: responseText,
        suggestedActions,
        model: response.model,
        provider: response.provider
      };
    } catch (error) {
      logger.error(`Error generating response: ${error.message}`);
      return {
        text: "I apologize, but I'm having trouble processing your request right now. Would you like me to connect you with a live agent?",
        suggestedActions: ['transfer_to_agent']
      };
    }
  }

  // Extract suggested actions from response
  extractSuggestedActions(responseText, analysis) {
    const actions = [];

    // Check for common patterns
    if (responseText.toLowerCase().includes('create a lead')) {
      actions.push('create_lead');
    }
    if (responseText.toLowerCase().includes('upgrade')) {
      actions.push('view_pricing');
    }
    if (responseText.toLowerCase().includes('demo') || responseText.toLowerCase().includes('tutorial')) {
      actions.push('start_tutorial');
    }

    return actions;
  }

  // Transfer to live agent
  async transferToAgent(sessionId, reason = 'user_requested') {
    try {
      const session = await ChatSession.findOne({ sessionId });

      if (!session) {
        throw new Error('Session not found');
      }

      await session.requestAgentTransfer(reason, 'ai_auto');

      // Find available agent (simplified - would integrate with agent availability system)
      const availableAgent = await this.findAvailableAgent();

      if (availableAgent) {
        await session.assignToAgent(availableAgent._id, availableAgent.name);

        return {
          transferred: true,
          agent: availableAgent.name,
          message: `You've been connected with ${availableAgent.name}. They'll be with you shortly.`
        };
      } else {
        return {
          transferred: false,
          message: "All agents are currently busy. You're in the queue and will be connected to the next available agent. Estimated wait time: 2-5 minutes."
        };
      }
    } catch (error) {
      logger.error(`Error transferring to agent: ${error.message}`);
      throw error;
    }
  }

  // Find available agent
  async findAvailableAgent() {
    // This would integrate with your agent availability system
    // For now, returning null (queue system)
    return null;
  }

  // End session
  async endSession(sessionId, feedback = null) {
    try {
      const session = await ChatSession.findOne({ sessionId });

      if (!session) {
        return { success: false, message: 'Session not found' };
      }

      session.status = 'resolved';
      session.metadata.endedAt = new Date();
      session.calculateDuration();

      if (feedback) {
        session.feedback = feedback;
      }

      // Evaluate AI performance
      if (session.handler.type === 'ai') {
        session.aiLearning = {
          successful: feedback?.rating >= 4,
          resolutionRate: feedback?.issueResolved ? 100 : 0
        };
      }

      await session.save();

      return { success: true, message: 'Session ended' };
    } catch (error) {
      logger.error(`Error ending session: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ChatbotAI();
