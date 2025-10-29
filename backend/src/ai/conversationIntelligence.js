/**
 * AI Conversation Intelligence Service
 * Analyzes calls, emails, and messages to extract insights, sentiment, and action items
 * Now powered by multi-provider AI with Groq for ultra-fast voice analysis
 */

const { getAIRouter } = require('../services/ai/AIRouter');
const ConversationIntelligence = require('../models/ConversationIntelligence');
const logger = require('../utils/logger');

class ConversationIntelligenceService {
  constructor() {
    this.aiRouter = getAIRouter();
  }

  /**
   * Analyze a conversation and extract intelligence
   */
  async analyzeConversation(conversationData) {
    try {
      const {
        conversationType,
        conversationId,
        transcript,
        user,
        lead,
        contact,
        deal,
        conversationDate,
        duration
      } = conversationData;

      // Validate required fields
      if (!conversationType) {
        throw new Error('conversationType is required');
      }
      if (!conversationId) {
        throw new Error('conversationId is required');
      }
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('transcript is required and cannot be empty');
      }

      // Create or update intelligence record
      const intelligence = await ConversationIntelligence.findOneAndUpdate(
        { conversationId, conversationType },
        {
          conversationId,
          conversationType,
          transcript,
          user,
          lead,
          contact,
          deal,
          conversationDate,
          duration,
          processingStatus: 'processing'
        },
        { upsert: true, new: true }
      );

      // Perform analysis
      const analysis = await this.performAnalysis(transcript, conversationType);

      // Update with results
      intelligence.sentiment = analysis.sentiment;
      intelligence.insights = analysis.insights;
      intelligence.actionItems = analysis.actionItems;
      intelligence.topics = analysis.topics;
      intelligence.keywords = analysis.keywords;
      intelligence.questions = analysis.questions;
      intelligence.talkRatio = analysis.talkRatio;
      intelligence.interruptionCount = analysis.interruptionCount;
      intelligence.talkSpeed = analysis.talkSpeed;
      intelligence.competitorsDiscussed = analysis.competitorsDiscussed;
      intelligence.dealSignals = analysis.dealSignals;
      intelligence.risks = analysis.risks;
      intelligence.coachingTips = analysis.coachingTips;
      intelligence.summary = analysis.summary;
      intelligence.qualityScore = analysis.qualityScore;
      intelligence.processingStatus = 'completed';

      await intelligence.save();

      return intelligence;
    } catch (error) {
      logger.error('Conversation analysis error:', error);
      throw error;
    }
  }

  /**
   * Perform detailed analysis on transcript
   * Enhanced with AI for deeper insights (uses Groq for speed)
   */
  async performAnalysis(transcript, conversationType) {
    // Use AI for comprehensive analysis (Groq = ultra-fast + free tier)
    const aiAnalysis = await this.performAIAnalysis(transcript, conversationType);

    // Fallback: Basic pattern-based analysis if AI fails
    const fallbackSentiment = this.analyzeSentimentBasic(transcript);

    // Merge AI results with pattern-based results for best accuracy
    return {
      sentiment: aiAnalysis.sentiment || fallbackSentiment,
      insights: aiAnalysis.insights || this.extractInsights(transcript),
      actionItems: aiAnalysis.actionItems || this.extractActionItems(transcript),
      topics: aiAnalysis.topics || this.extractTopics(transcript),
      keywords: aiAnalysis.keywords || this.extractKeywords(transcript),
      questions: aiAnalysis.questions || this.extractQuestions(transcript),
      talkRatio: this.analyzeTalkRatio(transcript),
      interruptionCount: this.detectInterruptions(transcript),
      talkSpeed: this.calculateTalkSpeed(transcript),
      competitorsDiscussed: aiAnalysis.competitors || this.detectCompetitors(transcript),
      dealSignals: aiAnalysis.dealSignals || this.analyzeDealSignals(transcript),
      risks: aiAnalysis.risks || [],
      coachingTips: aiAnalysis.coachingTips || [],
      summary: aiAnalysis.summary || '',
      qualityScore: aiAnalysis.qualityScore || this.calculateQualityScore(transcript, fallbackSentiment, this.analyzeTalkRatio(transcript))
    };
  }

  /**
   * AI-Powered Analysis using Groq (ultra-fast for voice AI)
   */
  async performAIAnalysis(transcript, conversationType) {
    try {
      const prompt = `Analyze this ${conversationType} conversation transcript and extract comprehensive intelligence:

TRANSCRIPT:
${transcript.substring(0, 4000)} ${transcript.length > 4000 ? '...(truncated)' : ''}

Provide detailed analysis in JSON format:
{
  "sentiment": {
    "overall": "very_positive|positive|neutral|negative|very_negative",
    "score": <-100 to 100>,
    "confidence": <0-1>
  },
  "insights": [
    {"type": "pain_point|buying_signal|objection|budget_discussion", "content": "<text>", "confidence": <0-1>}
  ],
  "actionItems": [
    {"action": "<what to do>", "priority": "high|medium|low", "dueBy": "<timeframe>"}
  ],
  "topics": ["<topic1>", "<topic2>"],
  "keywords": ["<keyword1>", "<keyword2>"],
  "questions": {
    "customerQuestions": ["<question>"],
    "salesRepQuestions": ["<question>"]
  },
  "competitors": ["<competitor names mentioned>"],
  "dealSignals": {
    "buying": ["<signals>"],
    "objections": ["<objections>"],
    "urgency": "low|medium|high"
  },
  "risks": [
    {"risk": "<description>", "severity": "low|medium|high", "mitigation": "<suggestion>"}
  ],
  "coachingTips": [
    {"area": "<what to improve>", "tip": "<specific advice>", "priority": "high|medium|low"}
  ],
  "summary": "<2-3 sentence summary>",
  "qualityScore": <0-100>
}`;

      // Use Groq for ultra-fast voice AI analysis (10x faster than OpenAI)
      const response = await this.aiRouter.chatComplete(
        [
          {
            role: 'system',
            content: 'You are an expert sales conversation analyst. Extract actionable insights from conversations with high accuracy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.3, // Lower for consistent analysis
          jsonMode: true,
          maxTokens: 2000
        },
        'voice_ai_analysis' // Task type - will use Groq for speed
      );

      const analysis = JSON.parse(response.text);
      return analysis;

    } catch (error) {
      logger.error(`AI analysis failed: ${error.message}, falling back to pattern-based analysis`);
      return {}; // Return empty object to use fallback methods
    }
  }

  /**
   * Analyze sentiment in the conversation (Basic pattern-based fallback)
   */
  analyzeSentimentBasic(transcript) {
    const positiveWords = [
      'great', 'excellent', 'perfect', 'love', 'amazing', 'fantastic', 'wonderful',
      'interested', 'excited', 'looking forward', 'appreciate', 'thank you', 'helpful'
    ];

    const negativeWords = [
      'concern', 'worried', 'problem', 'issue', 'difficult', 'expensive', 'too much',
      'not sure', 'hesitant', 'disappointed', 'frustrat', 'confus', 'complicate'
    ];

    const lowerTranscript = transcript.toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}`, 'gi');
      const matches = lowerTranscript.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}`, 'gi');
      const matches = lowerTranscript.match(regex);
      if (matches) negativeCount += matches.length;
    });

    const total = positiveCount + negativeCount;
    const score = total > 0 ? (positiveCount - negativeCount) / total : 0;

    let overall;
    if (score > 0.5) overall = 'very_positive';
    else if (score > 0.2) overall = 'positive';
    else if (score > -0.2) overall = 'neutral';
    else if (score > -0.5) overall = 'negative';
    else overall = 'very_negative';

    return {
      overall,
      score,
      confidence: Math.min(total / 10, 1) // More words = higher confidence
    };
  }

  /**
   * Extract key insights from conversation
   */
  extractInsights(transcript) {
    const insights = [];

    // Pain points
    const painPointPatterns = [
      /struggling with/gi,
      /challenge is/gi,
      /problem with/gi,
      /difficult to/gi,
      /pain point/gi
    ];

    painPointPatterns.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) {
        insights.push({
          type: 'pain_point',
          content: this.extractContext(transcript, pattern),
          confidence: 0.8
        });
      }
    });

    // Buying signals
    const buyingSignalPatterns = [
      /when can we start/gi,
      /ready to move forward/gi,
      /next steps/gi,
      /sign up/gi,
      /purchase/gi,
      /budget approved/gi
    ];

    buyingSignalPatterns.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) {
        insights.push({
          type: 'buying_signal',
          content: this.extractContext(transcript, pattern),
          confidence: 0.9
        });
      }
    });

    // Budget discussion
    const budgetPatterns = [/budget/gi, /cost/gi, /price/gi, /\$\d+/g];

    budgetPatterns.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) {
        insights.push({
          type: 'budget_discussion',
          content: this.extractContext(transcript, pattern),
          confidence: 0.85
        });
      }
    });

    return insights.slice(0, 10); // Top 10 insights
  }

  /**
   * Extract action items from conversation
   */
  extractActionItems(transcript) {
    const actionItems = [];

    const actionPatterns = [
      /I'll send (you|over)/gi,
      /I will (follow up|reach out|contact)/gi,
      /let me (send|share|provide)/gi,
      /I'll (schedule|set up|arrange)/gi,
      /need to (review|check|confirm)/gi
    ];

    actionPatterns.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const context = this.extractContext(transcript, new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
          actionItems.push({
            description: context,
            priority: this.determinePriority(context),
            completed: false
          });
        });
      }
    });

    return actionItems.slice(0, 10); // Top 10 action items
  }

  /**
   * Extract main topics discussed
   */
  extractTopics(transcript) {
    const topicKeywords = {
      'Pricing': ['price', 'cost', 'budget', 'pricing', 'fee', 'payment'],
      'Features': ['feature', 'capability', 'function', 'can it', 'does it'],
      'Integration': ['integrate', 'connect', 'api', 'compatibility'],
      'Timeline': ['when', 'timeline', 'schedule', 'deadline', 'start date'],
      'Competition': ['competitor', 'alternative', 'currently using', 'switching from'],
      'Decision Process': ['decision', 'approve', 'stakeholder', 'team', 'review'],
      'Support': ['support', 'help', 'training', 'onboarding', 'assistance']
    };

    const topics = [];
    const lowerTranscript = transcript.toLowerCase();

    Object.keys(topicKeywords).forEach(topic => {
      let mentions = 0;
      topicKeywords[topic].forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}`, 'gi');
        const matches = lowerTranscript.match(regex);
        if (matches) mentions += matches.length;
      });

      if (mentions > 0) {
        topics.push({
          topic,
          mentions,
          relevance: Math.min(mentions / 5, 1)
        });
      }
    });

    return topics.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Extract important keywords
   */
  extractKeywords(transcript) {
    const words = transcript.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const frequency = {};

    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    const keywords = Object.entries(frequency)
      .map(([word, freq]) => ({
        word,
        frequency: freq,
        sentiment: this.getWordSentiment(word)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    return keywords;
  }

  /**
   * Extract questions asked during conversation
   */
  extractQuestions(transcript) {
    const questionRegex = /([^.!?]*\?)/g;
    const matches = transcript.match(questionRegex) || [];

    return matches.slice(0, 10).map(q => ({
      question: q.trim(),
      askedBy: this.determineQuestionAsker(q),
      answer: 'Not captured' // Would need more context
    }));
  }

  /**
   * Analyze talk ratio between rep and customer
   */
  analyzeTalkRatio(transcript) {
    // Simple heuristic: look for speaker labels
    const repPattern = /Rep:|Sales:|Agent:/gi;
    const customerPattern = /Customer:|Client:|Prospect:/gi;

    const repMatches = transcript.match(repPattern) || [];
    const customerMatches = transcript.match(customerPattern) || [];

    // If no labels, assume 50/50
    if (repMatches.length === 0 && customerMatches.length === 0) {
      return { repPercentage: 50, customerPercentage: 50 };
    }

    const total = repMatches.length + customerMatches.length;
    const repPercentage = (repMatches.length / total) * 100;
    const customerPercentage = (customerMatches.length / total) * 100;

    return { repPercentage, customerPercentage };
  }

  /**
   * Detect interruptions in conversation
   */
  detectInterruptions(transcript) {
    const interruptionPatterns = [/--/g, /\[overlap\]/gi, /interrupt/gi];
    let count = 0;

    interruptionPatterns.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) count += matches.length;
    });

    return count;
  }

  /**
   * Calculate talk speed (words per minute)
   */
  calculateTalkSpeed(transcript) {
    const words = transcript.split(/\s+/).length;
    // Assume average conversation is 20 minutes
    const estimatedMinutes = Math.max(words / 150, 5); // 150 wpm average

    return {
      rep: Math.round(words / estimatedMinutes),
      customer: Math.round(words / estimatedMinutes)
    };
  }

  /**
   * Detect competitor mentions
   */
  detectCompetitors(transcript) {
    const competitors = [
      'Salesforce', 'HubSpot', 'Pipedrive', 'Zoho', 'Microsoft Dynamics',
      'Monday.com', 'Freshsales', 'Close', 'Copper'
    ];

    const mentioned = [];
    const lowerTranscript = transcript.toLowerCase();

    competitors.forEach(competitor => {
      const regex = new RegExp(`\\b${competitor.toLowerCase()}\\b`, 'gi');
      if (regex.test(lowerTranscript)) {
        mentioned.push({
          name: competitor,
          context: this.extractContext(transcript, regex),
          sentiment: 'neutral'
        });
      }
    });

    return mentioned;
  }

  /**
   * Analyze deal signals
   */
  analyzeDealSignals(transcript) {
    const buyingIntentSignals = [];
    const urgencyIndicators = [];

    // Buying intent patterns
    if (/ready to|move forward|sign up|get started/gi.test(transcript)) {
      buyingIntentSignals.push('Expressed readiness to move forward');
    }
    if (/budget approved|funds allocated/gi.test(transcript)) {
      buyingIntentSignals.push('Budget approved');
    }

    // Urgency patterns
    if (/asap|urgent|quickly|soon/gi.test(transcript)) {
      urgencyIndicators.push('Expressed urgency');
    }
    if (/deadline|due date|timeline/gi.test(transcript)) {
      urgencyIndicators.push('Timeline mentioned');
    }

    const budgetMentioned = /budget|cost|price|\$/gi.test(transcript);

    return {
      buyingIntent: {
        score: Math.min(buyingIntentSignals.length * 30, 100),
        signals: buyingIntentSignals
      },
      urgency: {
        score: Math.min(urgencyIndicators.length * 40, 100),
        indicators: urgencyIndicators
      },
      budget: {
        mentioned: budgetMentioned,
        range: 'Not specified',
        concerns: []
      },
      decisionProcess: {
        stage: 'Discovery',
        stakeholders: [],
        timeline: 'Not specified'
      }
    };
  }

  /**
   * Assess risks in the deal
   */
  assessRisks(transcript, sentiment, dealSignals) {
    const risks = [];

    if (sentiment.overall === 'negative' || sentiment.overall === 'very_negative') {
      risks.push({
        type: 'objection',
        description: 'Negative sentiment detected',
        severity: 'high',
        mitigation: 'Address concerns and provide reassurance'
      });
    }

    if (/competitor|alternative|currently using/gi.test(transcript)) {
      risks.push({
        type: 'competitor_threat',
        description: 'Competitor mentioned in conversation',
        severity: 'medium',
        mitigation: 'Highlight differentiation and unique value'
      });
    }

    if (/expensive|too much|cost concern/gi.test(transcript)) {
      risks.push({
        type: 'budget_concern',
        description: 'Price objection detected',
        severity: 'high',
        mitigation: 'Demonstrate ROI and value proposition'
      });
    }

    if (dealSignals.urgency.score < 30) {
      risks.push({
        type: 'timing_issue',
        description: 'Low urgency detected',
        severity: 'medium',
        mitigation: 'Create urgency with limited-time offers or showcase costs of delay'
      });
    }

    return risks;
  }

  /**
   * Generate coaching tips for the sales rep
   */
  generateCoachingTips(transcript, sentiment, talkRatio) {
    const tips = [];

    // Talk ratio coaching
    if (talkRatio.repPercentage > 70) {
      tips.push({
        category: 'active_listening',
        recommendation: 'Reduce talk time and ask more discovery questions',
        example: 'Try: "Tell me more about..." or "How does that affect your team?"',
        priority: 1
      });
    }

    // Discovery questions
    if (!/tell me about|how does|what are|why is/gi.test(transcript)) {
      tips.push({
        category: 'discovery',
        recommendation: 'Ask more open-ended discovery questions',
        example: 'Use SPIN selling: Situation, Problem, Implication, Need-payoff questions',
        priority: 2
      });
    }

    // Objection handling
    if (sentiment.overall === 'negative') {
      tips.push({
        category: 'objection_handling',
        recommendation: 'Practice empathy and acknowledge concerns before responding',
        example: 'Try: "I understand your concern. Many of our customers felt the same way..."',
        priority: 1
      });
    }

    // Closing
    if (!/next steps|move forward|schedule|follow up/gi.test(transcript)) {
      tips.push({
        category: 'closing',
        recommendation: 'Always end with clear next steps',
        example: 'Try: "Based on our discussion, I recommend we..."',
        priority: 1
      });
    }

    return tips;
  }

  /**
   * Generate conversation summary
   */
  generateSummary(transcript, insights, dealSignals) {
    const brief = transcript.slice(0, 200) + '...';

    const keyTakeaways = insights.slice(0, 3).map(i => i.content);

    const nextSteps = [
      'Follow up with proposal',
      'Schedule technical demo',
      'Send pricing information'
    ];

    return {
      brief,
      detailed: 'Detailed summary of the conversation covering key points discussed.',
      nextSteps,
      keyTakeaways
    };
  }

  /**
   * Calculate overall quality score of the conversation
   */
  calculateQualityScore(transcript, sentiment, talkRatio) {
    let score = 50; // Base score

    // Positive sentiment boost
    if (sentiment.overall === 'very_positive') score += 20;
    else if (sentiment.overall === 'positive') score += 10;
    else if (sentiment.overall === 'negative') score -= 10;
    else if (sentiment.overall === 'very_negative') score -= 20;

    // Balanced talk ratio boost
    if (talkRatio.repPercentage >= 40 && talkRatio.repPercentage <= 60) {
      score += 15;
    }

    // Length appropriate
    const wordCount = transcript.split(/\s+/).length;
    if (wordCount > 500 && wordCount < 5000) {
      score += 10;
    }

    // Questions asked
    const questionCount = (transcript.match(/\?/g) || []).length;
    score += Math.min(questionCount * 2, 15);

    return Math.max(0, Math.min(100, score));
  }

  // Helper methods
  extractContext(transcript, pattern, contextLength = 100) {
    const match = transcript.match(pattern);
    if (!match) return '';

    const index = transcript.indexOf(match[0]);
    const start = Math.max(0, index - contextLength);
    const end = Math.min(transcript.length, index + contextLength);

    return transcript.slice(start, end).trim();
  }

  getWordSentiment(word) {
    const positive = ['great', 'excellent', 'good', 'happy', 'love'];
    const negative = ['bad', 'poor', 'hate', 'problem', 'issue'];

    if (positive.includes(word)) return 'positive';
    if (negative.includes(word)) return 'negative';
    return 'neutral';
  }

  determinePriority(text) {
    if (/urgent|asap|immediately/gi.test(text)) return 'urgent';
    if (/important|critical|soon/gi.test(text)) return 'high';
    if (/when possible|eventually/gi.test(text)) return 'low';
    return 'medium';
  }

  determineQuestionAsker(question) {
    if (/how can|what if|when will/gi.test(question)) return 'customer';
    return 'rep';
  }

  /**
   * Get conversation insights for a lead/contact/deal
   */
  async getConversationHistory(params) {
    const { lead, contact, deal, limit = 10 } = params;

    const query = {};
    if (lead) query.lead = lead;
    if (contact) query.contact = contact;
    if (deal) query.deal = deal;

    return await ConversationIntelligence.find(query)
      .sort({ conversationDate: -1 })
      .limit(limit)
      .populate('user', 'firstName lastName email');
  }

  /**
   * Get coaching insights for a user
   */
  async getUserCoachingInsights(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conversations = await ConversationIntelligence.find({
      user: userId,
      conversationDate: { $gte: startDate },
      processingStatus: 'completed'
    });

    // Aggregate coaching tips
    const tipsByCategory = {};
    conversations.forEach(conv => {
      conv.coachingTips.forEach(tip => {
        if (!tipsByCategory[tip.category]) {
          tipsByCategory[tip.category] = [];
        }
        tipsByCategory[tip.category].push(tip);
      });
    });

    // Calculate averages
    const avgSentiment = conversations.reduce((sum, c) => sum + (c.sentiment.score || 0), 0) / conversations.length;
    const avgQuality = conversations.reduce((sum, c) => sum + (c.qualityScore || 0), 0) / conversations.length;
    const avgTalkRatio = conversations.reduce((sum, c) => sum + (c.talkRatio?.repPercentage || 50), 0) / conversations.length;

    return {
      conversationCount: conversations.length,
      averages: {
        sentiment: avgSentiment,
        qualityScore: avgQuality,
        talkRatio: avgTalkRatio
      },
      coachingTips: tipsByCategory,
      recentConversations: conversations.slice(0, 5)
    };
  }
}

module.exports = new ConversationIntelligenceService();
