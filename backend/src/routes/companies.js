const express = require('express');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all companies
router.get('/', auth, async (req, res) => {
  try {
    const {
      industry,
      employeeCount,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = { isArchived: false };

    // Filter by user role
    if (req.user.role === 'sales_rep') {
      query.owner = req.user._id;
    }

    if (industry) query.industry = industry;
    if (employeeCount) query.employeeCount = employeeCount;

    // Search
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { website: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    // Execute query
    const companies = await Company.find(query)
      .populate('owner', 'name email')
      .populate('contacts', 'firstName lastName email')
      .populate('deals', 'name value stage')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Company.countDocuments(query);

    res.json({
      companies,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get company stats overview
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const query = req.user.role === 'sales_rep' ? { owner: req.user._id, isArchived: false } : { isArchived: false };
    const total = await Company.countDocuments(query);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single company
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('contacts')
      .populate('deals');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && company.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create company
router.post('/', auth, async (req, res) => {
  try {
    const companyData = {
      ...req.body,
      owner: req.body.owner || req.user._id
    };

    const company = new Company(companyData);
    await company.save();

    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update company
router.put('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && company.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    Object.assign(company, req.body);
    await company.save();

    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete company (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && company.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    company.isArchived = true;
    company.archivedAt = new Date();
    await company.save();

    res.json({ message: 'Company archived successfully' });
  } catch (error) {
    console.error('Error archiving company:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get company analytics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('contacts')
      .populate('deals');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Calculate analytics
    const totalDeals = company.deals.length;
    const activeDeals = company.deals.filter(deal =>
      !['closed_won', 'closed_lost'].includes(deal.stage)
    ).length;
    const wonDeals = company.deals.filter(deal => deal.stage === 'closed_won').length;
    const totalRevenue = company.deals
      .filter(deal => deal.stage === 'closed_won')
      .reduce((sum, deal) => sum + deal.value, 0);
    const pipelineValue = company.deals
      .filter(deal => !['closed_won', 'closed_lost'].includes(deal.stage))
      .reduce((sum, deal) => sum + deal.value, 0);

    res.json({
      totalContacts: company.contacts.length,
      totalDeals,
      activeDeals,
      wonDeals,
      totalRevenue,
      pipelineValue,
      healthScore: company.healthScore,
      lastActivity: company.updatedAt
    });
  } catch (error) {
    console.error('Error fetching company analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Link contact to company
router.post('/:id/contacts/:contactId', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    const contact = await Contact.findById(req.params.contactId);

    if (!company || !contact) {
      return res.status(404).json({ error: 'Company or Contact not found' });
    }

    if (!company.contacts.includes(contact._id)) {
      company.contacts.push(contact._id);
      await company.save();
    }

    if (!contact.company || contact.company.toString() !== company._id.toString()) {
      contact.company = company._id;
      await contact.save();
    }

    res.json(company);
  } catch (error) {
    console.error('Error linking contact:', error);
    res.status(400).json({ error: error.message });
  }
});

// Unlink contact from company
router.delete('/:id/contacts/:contactId', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    const contact = await Contact.findById(req.params.contactId);

    if (!company || !contact) {
      return res.status(404).json({ error: 'Company or Contact not found' });
    }

    company.contacts = company.contacts.filter(
      c => c.toString() !== contact._id.toString()
    );
    await company.save();

    contact.company = null;
    await contact.save();

    res.json(company);
  } catch (error) {
    console.error('Error unlinking contact:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get company stats
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const query = req.user.role === 'sales_rep'
      ? { owner: req.user._id, isArchived: false }
      : { isArchived: false };

    const totalCompanies = await Company.countDocuments(query);

    const companies = await Company.find(query).populate('deals');

    let totalRevenue = 0;
    let activePipeline = 0;

    companies.forEach(company => {
      company.deals.forEach(deal => {
        if (deal.stage === 'closed_won') {
          totalRevenue += deal.value;
        } else if (!['closed_lost'].includes(deal.stage)) {
          activePipeline += deal.value;
        }
      });
    });

    const topIndustries = await Company.aggregate([
      { $match: query },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalCompanies,
      totalRevenue,
      activePipeline,
      topIndustries
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
