const express = require('express');
const Contact = require('../models/Contact');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all contacts
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      company,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = {};

    // Filter by user role
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    if (status) query.status = status;
    if (company) query.company = company;

    // Search
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { jobTitle: new RegExp(search, 'i') }
      ];
    }

    // Execute query
    const contacts = await Contact.find(query)
      .populate('owner', 'name email')
      .populate('company', 'name industry')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Contact.countDocuments(query);

    res.json({
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single contact
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('company');

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && contact.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create contact
router.post('/', auth, async (req, res) => {
  try {
    const contactData = {
      ...req.body,
      owner: req.body.owner || req.user._id
    };

    const contact = new Contact(contactData);
    await contact.save();

    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update contact
router.put('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && contact.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(contact, req.body);
    await contact.save();

    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete contact
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && contact.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await contact.deleteOne();

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update engagement metrics
router.patch('/:id/engagement', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Update engagement metrics
    if (req.body.type) {
      switch (req.body.type) {
        case 'email_sent':
          contact.engagement.emailsSent++;
          contact.engagement.lastContacted = new Date();
          break;
        case 'email_opened':
          contact.engagement.emailsOpened++;
          contact.engagement.lastEmailOpened = new Date();
          break;
        case 'email_clicked':
          contact.engagement.lastEmailClicked = new Date();
          break;
        case 'call_made':
          contact.engagement.callsMade++;
          contact.engagement.lastContacted = new Date();
          break;
        case 'meeting_held':
          contact.engagement.meetingsHeld++;
          contact.engagement.lastMeeting = new Date();
          contact.engagement.lastContacted = new Date();
          break;
      }
    }

    // Update custom engagement data
    if (req.body.engagement) {
      Object.assign(contact.engagement, req.body.engagement);
    }

    await contact.save();

    res.json(contact);
  } catch (error) {
    console.error('Error updating engagement:', error);
    res.status(400).json({ error: error.message });
  }
});

// Bulk operations
router.post('/bulk', auth, async (req, res) => {
  try {
    const { action, contactIds, data } = req.body;

    if (!action || !contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({ error: 'Invalid bulk operation request' });
    }

    let result;

    switch (action) {
      case 'update':
        result = await Contact.updateMany(
          { _id: { $in: contactIds }, owner: req.user._id },
          { $set: data }
        );
        break;

      case 'delete':
        result = await Contact.deleteMany({
          _id: { $in: contactIds },
          owner: req.user._id
        });
        break;

      case 'assign':
        if (!data.owner) {
          return res.status(400).json({ error: 'Owner ID required for assignment' });
        }
        result = await Contact.updateMany(
          { _id: { $in: contactIds } },
          { $set: { owner: data.owner } }
        );
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      success: true,
      modified: result.modifiedCount || result.deletedCount,
      message: `Bulk ${action} completed successfully`
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
