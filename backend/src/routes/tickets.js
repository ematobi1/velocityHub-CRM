const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/tickets — list tickets (admins see all, users see their own)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, category, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      query.submittedBy = req.user._id;
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (search) query.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { ticketNumber: { $regex: search, $options: 'i' } }
    ];

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('submittedBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Ticket.countDocuments(query)
    ]);

    res.json({ tickets, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Get tickets error:', err);
    res.status(500).json({ error: 'Failed to retrieve tickets' });
  }
});

// GET /api/tickets/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' || req.user.role === 'manager'
      ? {} : { submittedBy: req.user._id };

    const [open, in_progress, resolved, urgent] = await Promise.all([
      Ticket.countDocuments({ ...query, status: 'open' }),
      Ticket.countDocuments({ ...query, status: 'in_progress' }),
      Ticket.countDocuments({ ...query, status: 'resolved' }),
      Ticket.countDocuments({ ...query, priority: 'urgent', status: { $nin: ['resolved', 'closed'] } })
    ]);

    res.json({ open, in_progress, resolved, urgent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ticket stats' });
  }
});

// GET /api/tickets/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const isOwner = ticket.submittedBy._id.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isOwner && !isStaff) return res.status(403).json({ error: 'Forbidden' });

    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve ticket' });
  }
});

// POST /api/tickets
router.post('/', auth, async (req, res) => {
  try {
    const { subject, description, priority, category } = req.body;
    if (!subject || !description) {
      return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'Subject and description are required' } });
    }

    const ticket = new Ticket({
      subject,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      submittedBy: req.user._id,
      messages: [{ sender: 'user', senderName: req.user.firstName || req.user.name, body: description }]
    });

    await ticket.save();
    await ticket.populate('submittedBy', 'firstName lastName email');
    res.status(201).json({ ticket });
  } catch (err) {
    logger.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const isStaff = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isStaff) return res.status(403).json({ error: 'Forbidden' });

    const allowed = ['status', 'priority', 'assignedTo', 'tags'];
    allowed.forEach(f => { if (req.body[f] !== undefined) ticket[f] = req.body[f]; });

    await ticket.save();
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// POST /api/tickets/:id/messages
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: 'Message body is required' } });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const isOwner = ticket.submittedBy.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'admin' || req.user.role === 'manager';
    if (!isOwner && !isStaff) return res.status(403).json({ error: 'Forbidden' });

    const sender = isStaff ? 'agent' : 'user';
    ticket.messages.push({ sender, senderName: req.user.firstName || req.user.name, body });

    if (sender === 'agent' && !ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    if (ticket.status === 'open' && sender === 'agent') ticket.status = 'in_progress';
    if (ticket.status === 'waiting' && sender === 'user') ticket.status = 'in_progress';

    await ticket.save();
    res.json({ message: ticket.messages[ticket.messages.length - 1] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// DELETE /api/tickets/:id — admin only
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
