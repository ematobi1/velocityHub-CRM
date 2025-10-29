const express = require('express');
const EmailSequence = require('../models/EmailSequence');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all email sequences
router.get('/', auth, async (req, res) => {
  try {
    const query = { isArchived: false };

    if (req.user.role === 'sales_rep') {
      query.createdBy = req.user._id;
    }

    const sequences = await EmailSequence.find(query)
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: sequences.length,
      sequences
    });
  } catch (error) {
    console.error('Get sequences error:', error);
    res.status(500).json({ error: 'Failed to fetch sequences' });
  }
});

// Get single sequence
router.get('/:id', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('enrolledLeads.lead', 'firstName lastName email company status');

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    res.json({
      success: true,
      sequence
    });
  } catch (error) {
    console.error('Get sequence error:', error);
    res.status(500).json({ error: 'Failed to fetch sequence' });
  }
});

// Create email sequence
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      steps,
      triggerEvent,
      enrollmentCriteria,
      settings
    } = req.body;

    if (!name || !steps || steps.length === 0) {
      return res.status(400).json({ error: 'Name and steps are required' });
    }

    // Validate steps
    for (const step of steps) {
      if (!step.subject || !step.content) {
        return res.status(400).json({ error: 'Each step must have subject and content' });
      }
      if (typeof step.delayDays !== 'number' || step.delayDays < 0) {
        return res.status(400).json({ error: 'Each step must have a valid delayDays' });
      }
    }

    const sequence = new EmailSequence({
      name,
      description,
      steps,
      triggerEvent: triggerEvent || 'manual',
      enrollmentCriteria: enrollmentCriteria || {},
      settings: settings || {},
      createdBy: req.user._id,
      status: 'draft'
    });

    await sequence.save();

    res.status(201).json({
      success: true,
      message: 'Sequence created successfully',
      sequence
    });
  } catch (error) {
    console.error('Create sequence error:', error);
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

// Update sequence
router.put('/:id', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Check permissions
    if (req.user.role === 'sales_rep' && sequence.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow editing if active and has enrolled leads
    if (sequence.status === 'active' && sequence.enrolledLeads.length > 0) {
      return res.status(400).json({ error: 'Cannot edit active sequence with enrolled leads' });
    }

    const allowedUpdates = ['name', 'description', 'steps', 'enrollmentCriteria', 'settings'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        sequence[key] = req.body[key];
      }
    });

    await sequence.save();

    res.json({
      success: true,
      message: 'Sequence updated successfully',
      sequence
    });
  } catch (error) {
    console.error('Update sequence error:', error);
    res.status(500).json({ error: 'Failed to update sequence' });
  }
});

// Activate sequence
router.post('/:id/activate', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    if (sequence.status === 'active') {
      return res.status(400).json({ error: 'Sequence is already active' });
    }

    sequence.status = 'active';
    sequence.activatedAt = new Date();
    await sequence.save();

    res.json({
      success: true,
      message: 'Sequence activated successfully',
      sequence
    });
  } catch (error) {
    console.error('Activate sequence error:', error);
    res.status(500).json({ error: 'Failed to activate sequence' });
  }
});

// Pause sequence
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    if (sequence.status !== 'active') {
      return res.status(400).json({ error: 'Only active sequences can be paused' });
    }

    sequence.status = 'paused';
    await sequence.save();

    res.json({
      success: true,
      message: 'Sequence paused successfully',
      sequence
    });
  } catch (error) {
    console.error('Pause sequence error:', error);
    res.status(500).json({ error: 'Failed to pause sequence' });
  }
});

// Enroll leads in sequence
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    const sequence = await EmailSequence.findById(req.params.id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    if (sequence.status !== 'active') {
      return res.status(400).json({ error: 'Sequence must be active to enroll leads' });
    }

    const Lead = require('../models/Lead');
    const leads = await Lead.find({ _id: { $in: leadIds }, isArchived: false });

    let enrolled = 0;
    let alreadyEnrolled = 0;

    for (const lead of leads) {
      // Check if already enrolled
      const existing = sequence.enrolledLeads.find(
        el => el.lead.toString() === lead._id.toString()
      );

      if (existing) {
        alreadyEnrolled++;
        continue;
      }

      // Enroll lead
      sequence.enrolledLeads.push({
        lead: lead._id,
        enrolledAt: new Date(),
        currentStep: 0,
        status: 'active',
        nextEmailAt: new Date(), // Send first email immediately
        sentEmails: []
      });

      enrolled++;
    }

    sequence.performance.totalEnrolled += enrolled;
    await sequence.save();

    res.json({
      success: true,
      message: `Enrolled ${enrolled} leads. ${alreadyEnrolled} already enrolled.`,
      enrolled,
      alreadyEnrolled
    });
  } catch (error) {
    console.error('Enroll leads error:', error);
    res.status(500).json({ error: 'Failed to enroll leads' });
  }
});

// Unenroll lead from sequence
router.post('/:id/unenroll/:leadId', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const enrollmentIndex = sequence.enrolledLeads.findIndex(
      el => el.lead.toString() === req.params.leadId
    );

    if (enrollmentIndex === -1) {
      return res.status(404).json({ error: 'Lead not enrolled in this sequence' });
    }

    sequence.enrolledLeads[enrollmentIndex].status = 'unenrolled';
    sequence.enrolledLeads[enrollmentIndex].completedAt = new Date();

    await sequence.save();

    res.json({
      success: true,
      message: 'Lead unenrolled successfully'
    });
  } catch (error) {
    console.error('Unenroll lead error:', error);
    res.status(500).json({ error: 'Failed to unenroll lead' });
  }
});

// Get sequence analytics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id)
      .populate('enrolledLeads.lead', 'firstName lastName email status');

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Calculate analytics
    const totalEnrolled = sequence.enrolledLeads.length;
    const activeLeads = sequence.enrolledLeads.filter(el => el.status === 'active').length;
    const completedLeads = sequence.enrolledLeads.filter(el => el.status === 'completed').length;
    const unsubscribedLeads = sequence.enrolledLeads.filter(el => el.status === 'unsubscribed').length;

    const totalEmailsSent = sequence.enrolledLeads.reduce((sum, el) => sum + el.sentEmails.length, 0);
    const totalOpens = sequence.enrolledLeads.reduce((sum, el) =>
      sum + el.sentEmails.filter(e => e.opened).length, 0
    );
    const totalClicks = sequence.enrolledLeads.reduce((sum, el) =>
      sum + el.sentEmails.filter(e => e.clicked).length, 0
    );
    const totalReplies = sequence.enrolledLeads.reduce((sum, el) =>
      sum + el.sentEmails.filter(e => e.replied).length, 0
    );

    const openRate = totalEmailsSent > 0 ? ((totalOpens / totalEmailsSent) * 100).toFixed(2) : 0;
    const clickRate = totalEmailsSent > 0 ? ((totalClicks / totalEmailsSent) * 100).toFixed(2) : 0;
    const replyRate = totalEmailsSent > 0 ? ((totalReplies / totalEmailsSent) * 100).toFixed(2) : 0;

    // Per-step analytics
    const stepAnalytics = sequence.steps.map((step, index) => {
      const stepEmails = sequence.enrolledLeads.reduce((count, el) => {
        return count + el.sentEmails.filter(e => e.stepIndex === index).length;
      }, 0);

      const stepOpens = sequence.enrolledLeads.reduce((count, el) => {
        return count + el.sentEmails.filter(e => e.stepIndex === index && e.opened).length;
      }, 0);

      const stepClicks = sequence.enrolledLeads.reduce((count, el) => {
        return count + el.sentEmails.filter(e => e.stepIndex === index && e.clicked).length;
      }, 0);

      return {
        stepNumber: index + 1,
        subject: step.subject,
        sent: stepEmails,
        opens: stepOpens,
        clicks: stepClicks,
        openRate: stepEmails > 0 ? ((stepOpens / stepEmails) * 100).toFixed(2) : 0,
        clickRate: stepEmails > 0 ? ((stepClicks / stepEmails) * 100).toFixed(2) : 0
      };
    });

    res.json({
      success: true,
      analytics: {
        overview: {
          totalEnrolled,
          activeLeads,
          completedLeads,
          unsubscribedLeads,
          totalEmailsSent,
          totalOpens,
          totalClicks,
          totalReplies,
          openRate: parseFloat(openRate),
          clickRate: parseFloat(clickRate),
          replyRate: parseFloat(replyRate)
        },
        stepAnalytics
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Delete (archive) sequence
router.delete('/:id', auth, async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Check permissions
    if (req.user.role === 'sales_rep' && sequence.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    sequence.isArchived = true;
    sequence.archivedAt = new Date();
    sequence.status = 'archived';
    await sequence.save();

    res.json({
      success: true,
      message: 'Sequence archived successfully'
    });
  } catch (error) {
    console.error('Delete sequence error:', error);
    res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

module.exports = router;