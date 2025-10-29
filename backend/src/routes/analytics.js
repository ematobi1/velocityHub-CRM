const express = require('express');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview
router.get('/dashboard', auth, async (req, res) => {
  try {
    const query = req.user.role === 'sales_rep'
      ? { owner: req.user._id }
      : {};

    // Get current month and last month date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Leads metrics
    const totalLeads = await Lead.countDocuments({ ...query, isConverted: false });
    const newLeadsThisMonth = await Lead.countDocuments({
      ...query,
      createdAt: { $gte: currentMonthStart },
      isConverted: false
    });
    const convertedLeadsThisMonth = await Lead.countDocuments({
      ...query,
      isConverted: true,
      convertedAt: { $gte: currentMonthStart }
    });

    // Deals metrics
    const totalDeals = await Deal.countDocuments(query);
    const activeDeals = await Deal.countDocuments({
      ...query,
      stage: { $nin: ['closed_won', 'closed_lost'] }
    });
    const wonDealsThisMonth = await Deal.countDocuments({
      ...query,
      stage: 'closed_won',
      updatedAt: { $gte: currentMonthStart }
    });

    // Revenue metrics
    const deals = await Deal.find(query);
    const totalRevenue = deals
      .filter(d => d.stage === 'closed_won')
      .reduce((sum, d) => sum + d.value, 0);
    const pipelineValue = deals
      .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = deals
      .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
      .reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

    // Revenue this month
    const revenueThisMonth = deals
      .filter(d => d.stage === 'closed_won' && d.updatedAt >= currentMonthStart)
      .reduce((sum, d) => sum + d.value, 0);

    // Revenue last month
    const revenueLastMonth = deals
      .filter(d =>
        d.stage === 'closed_won' &&
        d.updatedAt >= lastMonthStart &&
        d.updatedAt <= lastMonthEnd
      )
      .reduce((sum, d) => sum + d.value, 0);

    // Calculate growth
    const revenueGrowth = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
      : 0;

    // Contacts and Companies
    const totalContacts = await Contact.countDocuments(query);
    const totalCompanies = await Company.countDocuments({ ...query, isArchived: false });

    // Top performing sales reps (if admin)
    let topPerformers = [];
    if (req.user.role === 'admin') {
      topPerformers = await Deal.aggregate([
        {
          $match: {
            stage: 'closed_won',
            updatedAt: { $gte: currentMonthStart }
          }
        },
        {
          $group: {
            _id: '$owner',
            revenue: { $sum: '$value' },
            deals: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            name: '$user.name',
            email: '$user.email',
            revenue: 1,
            deals: 1
          }
        }
      ]);
    }

    // Lead sources breakdown
    const leadSources = await Lead.aggregate([
      { $match: { ...query, isConverted: false } },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Deal stages distribution
    const dealStages = await Deal.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          value: { $sum: '$value' }
        }
      }
    ]);

    // Win rate
    const closedDeals = await Deal.countDocuments({
      ...query,
      stage: { $in: ['closed_won', 'closed_lost'] }
    });
    const wonDeals = await Deal.countDocuments({
      ...query,
      stage: 'closed_won'
    });
    const winRate = closedDeals > 0 ? ((wonDeals / closedDeals) * 100).toFixed(1) : 0;

    res.json({
      overview: {
        totalLeads,
        newLeadsThisMonth,
        convertedLeadsThisMonth,
        totalDeals,
        activeDeals,
        wonDealsThisMonth,
        totalContacts,
        totalCompanies,
        totalRevenue,
        revenueThisMonth,
        revenueLastMonth,
        revenueGrowth: parseFloat(revenueGrowth),
        pipelineValue,
        weightedPipeline,
        winRate: parseFloat(winRate)
      },
      leadSources,
      dealStages,
      topPerformers
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get revenue forecast
router.get('/revenue-forecast', auth, async (req, res) => {
  try {
    const query = req.user.role === 'sales_rep'
      ? { owner: req.user._id }
      : {};

    const deals = await Deal.find({
      ...query,
      stage: { $nin: ['closed_won', 'closed_lost'] }
    });

    // Group by expected close month
    const forecast = {};
    deals.forEach(deal => {
      const month = new Date(deal.closeDate).toISOString().slice(0, 7); // YYYY-MM
      if (!forecast[month]) {
        forecast[month] = {
          totalValue: 0,
          weightedValue: 0,
          deals: 0
        };
      }
      forecast[month].totalValue += deal.value;
      forecast[month].weightedValue += deal.value * deal.probability / 100;
      forecast[month].deals += 1;
    });

    // Convert to array and sort by month
    const forecastArray = Object.entries(forecast)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({ forecast: forecastArray });
  } catch (error) {
    console.error('Error fetching revenue forecast:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get performance metrics over time
router.get('/performance', auth, async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    const query = req.user.role === 'sales_rep'
      ? { owner: req.user._id }
      : {};

    // Calculate date range
    const now = new Date();
    const months = period === '6months' ? 6 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    // Get deals closed by month
    const dealsByMonth = await Deal.aggregate([
      {
        $match: {
          ...query,
          stage: 'closed_won',
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' }
          },
          revenue: { $sum: '$value' },
          deals: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get leads created by month
    const leadsByMonth = await Lead.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          leads: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      dealsByMonth,
      leadsByMonth
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get lead conversion funnel
router.get('/funnel', auth, async (req, res) => {
  try {
    const query = req.user.role === 'sales_rep'
      ? { owner: req.user._id }
      : {};

    const totalLeads = await Lead.countDocuments(query);
    const qualifiedLeads = await Lead.countDocuments({ ...query, score: { $gte: 70 } });
    const convertedLeads = await Lead.countDocuments({ ...query, isConverted: true });
    const totalDeals = await Deal.countDocuments(query);
    const wonDeals = await Deal.countDocuments({ ...query, stage: 'closed_won' });

    res.json({
      funnel: [
        { stage: 'Total Leads', count: totalLeads, percentage: 100 },
        {
          stage: 'Qualified Leads',
          count: qualifiedLeads,
          percentage: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0
        },
        {
          stage: 'Converted to Deals',
          count: convertedLeads,
          percentage: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0
        },
        {
          stage: 'Active Deals',
          count: totalDeals,
          percentage: totalLeads > 0 ? ((totalDeals / totalLeads) * 100).toFixed(1) : 0
        },
        {
          stage: 'Won Deals',
          count: wonDeals,
          percentage: totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : 0
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
