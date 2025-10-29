const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ChatSession = require('../models/ChatSession');

// Simple response generator (can be enhanced with OpenAI)
function generateSimpleResponse(message) {
  const msg = message.toLowerCase();

  // Greetings
  if (msg.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
    return "Hello! 👋 I'm your VelocityHub AI assistant. How can I help you today?";
  }

  // Help requests
  if (msg.includes('help')) {
    return "I can help you with:\n• Managing leads and deals\n• Viewing analytics\n• Creating companies and contacts\n• Using AI features\n\nWhat would you like to know more about?";
  }

  // Lead-related
  if (msg.includes('lead')) {
    return "I can help you with leads! You can view, create, score, and manage leads from the Leads page. Would you like me to explain any specific feature?";
  }

  // Deal/Pipeline
  if (msg.includes('deal') || msg.includes('pipeline')) {
    return "The Pipeline page shows all your deals in a Kanban view. You can drag deals between stages to track progress. Want to know more?";
  }

  // Analytics
  if (msg.includes('analytics') || msg.includes('report')) {
    return "Our Analytics dashboard shows revenue metrics, win rates, conversion funnels, and team performance. Check the Analytics page for detailed insights!";
  }

  // AI features
  if (msg.includes('ai') || msg.includes('score')) {
    return "VelocityHub has AI-powered lead scoring, deal predictions, and smart recommendations. Leads are automatically scored 0-100 based on engagement, company fit, and more!";
  }

  // Pricing
  if (msg.includes('price') || msg.includes('cost') || msg.includes('plan')) {
    return "We have 3 plans:\n• Free: $0/month - 1,000 contacts\n• Pro: $49/user/month - Unlimited + AI features\n• Enterprise: $99/user/month - Everything unlimited\n\nWant more details on any plan?";
  }

  // Default
  return "Thanks for your message! I'm here to help. You can ask me about leads, deals, analytics, AI features, or pricing. What would you like to know?";
}

// Start a new chat session
router.post('/sessions', async (req, res) => {
  try {
    const { visitorName, visitorEmail } = req.body;

    const session = new ChatSession({
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user: {
        userId: req.user?._id,
        name: visitorName,
        email: visitorEmail,
        isGuest: !req.user,
        guestInfo: !req.user ? {
          name: visitorName,
          email: visitorEmail
        } : undefined
      },
      status: 'ai_only',
      handler: {
        type: 'ai'
      },
      messages: [{
        id: `msg_${Date.now()}`,
        sender: {
          type: 'ai',
          name: 'AI Assistant'
        },
        content: {
          text: `Hi${visitorName ? ' ' + visitorName : ''}! 👋 I'm your AI assistant. How can I help you today?`
        },
        timestamp: new Date()
      }]
    });

    await session.save();

    res.json({
      success: true,
      session: {
        id: session._id,
        sessionId: session.sessionId,
        messages: session.messages,
        handler: session.handler,
        status: session.status
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat session
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId)
      .populate('user', 'firstName lastName email')
      .populate('agent', 'firstName lastName email');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        sessionId: session.sessionId,
        messages: session.messages,
        handler: session.handler,
        status: session.status,
        user: session.user
      }
    });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { message } = req.body;
    const session = await ChatSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message
    const userName = session.user?.name || session.user?.guestInfo?.name || 'User';
    session.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: {
        type: 'user',
        name: userName
      },
      content: {
        text: message
      },
      timestamp: new Date()
    });

    let response;

    if (session.handler.type === 'ai') {
      // Generate simple AI response (can be enhanced with OpenAI later)
      const aiResponseText = generateSimpleResponse(message);

      // Add AI response
      session.messages.push({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: {
          type: 'ai',
          name: 'AI Assistant'
        },
        content: {
          text: aiResponseText
        },
        timestamp: new Date()
      });

      response = {
        id: `msg_${Date.now()}_resp`,
        sender: {
          type: 'ai',
          name: 'AI Assistant'
        },
        content: {
          text: aiResponseText
        },
        timestamp: new Date()
      }
    } else if (session.handler.type === 'human') {
      // In agent mode, just acknowledge (agent will respond separately)
      response = {
        sender: 'system',
        content: 'Message sent to agent...',
        timestamp: new Date()
      };
    }

    session.metadata = session.metadata || {};
    session.metadata.lastActivityAt = new Date();
    await session.save();

    res.json({
      success: true,
      message: response,
      session: {
        handler: session.handler,
        status: session.status
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Request agent transfer
router.post('/sessions/:sessionId/request-agent', async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'waiting_for_agent';
    session.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: {
        type: 'system',
        name: 'System'
      },
      content: {
        text: 'Requesting live agent... Please hold.'
      },
      timestamp: new Date()
    });

    await session.save();

    res.json({
      success: true,
      message: 'Agent requested',
      session: {
        status: session.status
      }
    });
  } catch (error) {
    console.error('Error requesting agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agent accepts chat (protected route for agents/admins)
router.post('/sessions/:sessionId/accept', auth, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'agent_active';
    session.handler = {
      type: 'human',
      agentId: req.user._id,
      agentName: `${req.user.firstName} ${req.user.lastName}`,
      transferredAt: new Date()
    };
    session.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: {
        type: 'system',
        name: 'System'
      },
      content: {
        text: `${req.user.firstName} ${req.user.lastName} has joined the chat.`
      },
      timestamp: new Date()
    });

    await session.save();

    res.json({
      success: true,
      message: 'Chat accepted',
      session
    });
  } catch (error) {
    console.error('Error accepting chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// End chat session
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const session = await ChatSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'resolved';
    session.metadata = session.metadata || {};
    session.metadata.endedAt = new Date();

    if (rating) {
      session.feedback = session.feedback || {};
      session.feedback.rating = rating;
      session.feedback.ratedAt = new Date();
    }

    if (feedback) {
      session.feedback = session.feedback || {};
      session.feedback.comment = feedback;
    }

    session.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: {
        type: 'system',
        name: 'System'
      },
      content: {
        text: 'Chat session ended. Thank you!'
      },
      timestamp: new Date()
    });

    await session.save();

    res.json({
      success: true,
      message: 'Chat ended',
      session: {
        status: session.status
      }
    });
  } catch (error) {
    console.error('Error ending chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active agent chats (for agents/admins)
router.get('/agent/active', auth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({
      $or: [
        { status: 'waiting_for_agent' },
        { 'handler.agentId': req.user._id, status: 'agent_active' }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error fetching active chats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
