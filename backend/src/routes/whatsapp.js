const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const logger = require('../utils/logger');

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  return require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// In-memory thread store (replace with MongoDB collection for production persistence)
const threads = {};

function storeMessage(phone, msg) {
  const key = phone.replace(/\D/g, '');
  if (!threads[key]) threads[key] = [];
  threads[key].push(msg);
}

// POST /api/whatsapp/send
router.post('/send', auth, async (req, res) => {
  try {
    const { to, body, contactId, leadId } = req.body;

    if (!to || !body) {
      return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'to and body are required' } });
    }

    const client = getTwilioClient();
    const from = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const message = await client.messages.create({ from, to: toFormatted, body });

    const record = {
      sid: message.sid,
      direction: 'outbound',
      body,
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      sentBy: req.user._id,
      timestamp: new Date().toISOString(),
      status: message.status
    };
    storeMessage(to, record);

    // Optionally log on lead/contact
    if (contactId) {
      await Contact.findByIdAndUpdate(contactId, {
        $push: { interactions: { type: 'whatsapp', description: body.slice(0, 100), date: new Date() } }
      });
    }
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, {
        $push: { 'interactions': { type: 'whatsapp', description: body.slice(0, 100), date: new Date() } }
      });
    }

    res.status(201).json({ message: record });
  } catch (err) {
    logger.error('WhatsApp send error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send WhatsApp message' });
  }
});

// GET /api/whatsapp/thread/:phone — retrieve conversation history
router.get('/thread/:phone', auth, (req, res) => {
  const key = req.params.phone.replace(/\D/g, '');
  res.json({ messages: threads[key] || [] });
});

// GET /api/whatsapp/threads — all active threads summary
router.get('/threads', auth, (req, res) => {
  const summary = Object.entries(threads).map(([phone, msgs]) => ({
    phone,
    lastMessage: msgs[msgs.length - 1],
    count: msgs.length
  }));
  res.json({ threads: summary.sort((a, b) => new Date(b.lastMessage?.timestamp) - new Date(a.lastMessage?.timestamp)) });
});

// POST /api/whatsapp/webhook — Twilio inbound webhook (no auth — Twilio signs with X-Twilio-Signature)
router.post('/webhook', express.urlencoded({ extended: false }), (req, res) => {
  const { From, Body, MessageSid } = req.body;
  if (!From || !Body) return res.status(400).send();

  const phone = From.replace('whatsapp:', '');
  const record = {
    sid: MessageSid,
    direction: 'inbound',
    body: Body,
    from: phone,
    to: process.env.TWILIO_PHONE_NUMBER,
    timestamp: new Date().toISOString(),
    status: 'received'
  };
  storeMessage(phone, record);
  logger.info(`WhatsApp inbound from ${phone}: ${Body.slice(0, 50)}`);

  // Respond with empty TwiML — no auto-reply
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');
});

// GET /api/whatsapp/status — check if Twilio is configured
router.get('/status', auth, (req, res) => {
  const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  res.json({ configured });
});

// GET /api/whatsapp/templates — pre-built message templates
router.get('/templates', auth, (req, res) => {
  res.json({
    templates: [
      { id: 'follow_up', name: 'Follow-up', body: 'Hi {{name}}, just following up on our conversation. Do you have any questions I can answer?' },
      { id: 'proposal_sent', name: 'Proposal Sent', body: 'Hi {{name}}, I just sent over the proposal to your email. Let me know when you have had a chance to review it!' },
      { id: 'meeting_reminder', name: 'Meeting Reminder', body: 'Hi {{name}}, just a reminder about our call tomorrow at {{time}}. Looking forward to it!' },
      { id: 'check_in', name: 'Check-in', body: 'Hi {{name}}, hope things are going well! I wanted to check in and see if now is a good time to connect.' },
      { id: 'deal_won', name: 'Welcome', body: 'Hi {{name}}, fantastic news — everything is confirmed! Welcome aboard. We will reach out shortly to kick things off.' }
    ]
  });
});

module.exports = router;
