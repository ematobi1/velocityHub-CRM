const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const STAGE_AVG_DAYS = {
  prospecting: 14,
  qualification: 10,
  proposal: 7,
  negotiation: 5,
  closed_won: 0,
  closed_lost: 0
};

function daysSince(date) {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function calcRiskScore(deal) {
  let score = 0;
  const factors = [];
  const signals = [];

  const daysSinceActivity = deal.activities?.length
    ? daysSince(deal.activities[deal.activities.length - 1].date)
    : daysSince(deal.updatedAt);

  // Silence penalty (heaviest weight — mirrors market research finding)
  if (daysSinceActivity > 21) {
    score += 40;
    factors.push({ factor: 'No activity in 21+ days', severity: 'critical', description: 'Champion may have gone dark. Re-engagement required.' });
  } else if (daysSinceActivity > 10) {
    score += 20;
    factors.push({ factor: 'No activity in 10+ days', severity: 'high', description: 'Momentum slowing. Schedule a touchpoint this week.' });
  } else if (daysSinceActivity > 5) {
    score += 8;
    factors.push({ factor: 'No activity in 5+ days', severity: 'medium', description: 'Consider a check-in to maintain engagement.' });
  } else {
    signals.push({ signal: 'Recent activity', strength: 'strong', description: `Last interaction ${daysSinceActivity} day(s) ago.` });
  }

  // Close date past-due
  if (deal.closeDate) {
    const daysToClose = Math.floor((new Date(deal.closeDate).getTime() - Date.now()) / 86400000);
    if (daysToClose < 0) {
      score += 25;
      factors.push({ factor: `Close date overdue by ${Math.abs(daysToClose)} days`, severity: 'critical', description: 'Deal is past its committed close date. Update or escalate.' });
    } else if (daysToClose < 7 && deal.stage !== 'negotiation' && deal.stage !== 'closed_won') {
      score += 15;
      factors.push({ factor: 'Close date within 7 days but not in negotiation', severity: 'high', description: 'Stage does not match expected close timeline.' });
    } else if (daysToClose <= 30) {
      signals.push({ signal: `Closing in ${daysToClose} days`, strength: 'moderate', description: 'Deal is within the 30-day horizon.' });
    }
  }

  // Stage stall — too long in current stage
  const expectedDays = STAGE_AVG_DAYS[deal.stage] || 14;
  const daysInStage = daysSince(deal.updatedAt);
  if (daysInStage > expectedDays * 2.5) {
    score += 20;
    factors.push({ factor: `Stalled in ${deal.stage} for ${daysInStage} days`, severity: 'high', description: `Typical ${deal.stage} stage takes ~${expectedDays} days. This deal is ${Math.round(daysInStage / expectedDays)}x overdue.` });
  } else if (daysInStage < expectedDays * 0.8) {
    signals.push({ signal: 'Moving fast through stage', strength: 'moderate', description: 'Deal is progressing ahead of average velocity.' });
  }

  // Single-threaded risk (only one contact)
  const contactCount = deal.stakeholders?.length || (deal.contact ? 1 : 0);
  if (contactCount <= 1) {
    score += 15;
    factors.push({ factor: 'Single-threaded deal', severity: 'medium', description: 'Only one known stakeholder. If the champion leaves or loses interest, the deal dies. Add multi-threading.' });
  } else if (contactCount >= 3) {
    signals.push({ signal: `${contactCount} stakeholders engaged`, strength: 'strong', description: 'Multi-threaded deal — lower champion departure risk.' });
  }

  // High value signal
  if (deal.value >= 50000) {
    signals.push({ signal: 'High-value deal', strength: 'strong', description: `$${deal.value.toLocaleString()} — prioritize executive sponsorship.` });
  }

  // Probability vs stage mismatch
  const stageProbMap = { prospecting: 10, qualification: 25, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0 };
  const expectedProb = stageProbMap[deal.stage];
  if (deal.probability && Math.abs(deal.probability - expectedProb) > 30) {
    score += 10;
    factors.push({ factor: `Probability mismatch (${deal.probability}% vs expected ~${expectedProb}%)`, severity: 'low', description: 'Rep-entered probability differs significantly from stage benchmark.' });
  }

  const riskLevel = score >= 50 ? 'critical' : score >= 30 ? 'high' : score >= 15 ? 'medium' : 'low';
  return { score: Math.min(score, 100), riskLevel, riskFactors: factors, positiveSignals: signals, daysSinceActivity };
}

function nextBestAction(deal, risk) {
  const actions = [];

  if (risk.daysSinceActivity > 10) {
    actions.push({ action: 'Send re-engagement email', priority: 'urgent', reason: 'No contact in 10+ days', estimatedImpact: '+20% survival rate' });
  }
  if (deal.stage === 'proposal' && risk.daysSinceActivity > 3) {
    actions.push({ action: 'Follow up on proposal', priority: 'high', reason: 'Proposal sent, no response tracked', estimatedImpact: '+15% close probability' });
  }
  if (risk.riskFactors.some(f => f.factor.includes('Single-threaded'))) {
    actions.push({ action: 'Add a second stakeholder contact', priority: 'high', reason: 'Single-threaded deals close 30% less often', estimatedImpact: '+30% deal resilience' });
  }
  if (deal.closeDate && new Date(deal.closeDate) < new Date()) {
    actions.push({ action: 'Update close date or escalate to manager', priority: 'urgent', reason: 'Close date is past due', estimatedImpact: 'Forecast accuracy' });
  }
  if (deal.stage === 'negotiation' && risk.daysSinceActivity <= 3) {
    actions.push({ action: 'Prepare mutual action plan / success criteria doc', priority: 'medium', reason: 'In negotiation with active engagement', estimatedImpact: '+10% close probability' });
  }

  return actions;
}

// GET /api/revenue-intelligence/overview
router.get('/overview', auth, async (req, res) => {
  try {
    const query = { stage: { $nin: ['closed_won', 'closed_lost'] }, isArchived: false };
    if (req.user.role === 'sales_rep') query.owner = req.user._id;

    const deals = await Deal.find(query)
      .populate('owner', 'firstName lastName email')
      .populate('contact', 'firstName lastName email');

    const analyzed = deals.map(deal => {
      const risk = calcRiskScore(deal);
      return {
        _id: deal._id,
        name: deal.name,
        value: deal.value,
        stage: deal.stage,
        closeDate: deal.closeDate,
        probability: deal.probability,
        owner: deal.owner,
        contact: deal.contact,
        ...risk,
        recommendedActions: nextBestAction(deal, risk)
      };
    });

    const atRisk = analyzed.filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high');
    const totalPipeline = analyzed.reduce((s, d) => s + (d.value || 0), 0);
    const atRiskValue = atRisk.reduce((s, d) => s + (d.value || 0), 0);
    const avgRisk = analyzed.length ? analyzed.reduce((s, d) => s + d.score, 0) / analyzed.length : 0;

    // Forecast: weight deals by (probability/100) × (1 - riskScore/200)
    const signalForecast = analyzed.reduce((s, d) => {
      const adj = ((d.probability || 10) / 100) * (1 - d.score / 200);
      return s + (d.value || 0) * adj;
    }, 0);
    const repForecast = analyzed.reduce((s, d) => s + (d.value || 0) * ((d.probability || 10) / 100), 0);

    const stalledDeals = analyzed.filter(d => d.daysSinceActivity > 10 && !['closed_won', 'closed_lost'].includes(d.stage));
    const singleThreaded = analyzed.filter(d => d.riskFactors.some(f => f.factor.includes('Single-threaded')));

    res.json({
      summary: {
        totalDeals: analyzed.length,
        totalPipeline,
        atRiskCount: atRisk.length,
        atRiskValue,
        avgRiskScore: Math.round(avgRisk),
        stalledCount: stalledDeals.length,
        singleThreadedCount: singleThreaded.length,
        repForecast: Math.round(repForecast),
        signalForecast: Math.round(signalForecast),
        forecastGap: Math.round(repForecast - signalForecast)
      },
      atRiskDeals: atRisk.sort((a, b) => b.value - a.value).slice(0, 10),
      allDeals: analyzed.sort((a, b) => b.score - a.score)
    });
  } catch (err) {
    logger.error('Revenue intelligence overview error:', err);
    res.status(500).json({ error: 'Failed to compute revenue intelligence' });
  }
});

// GET /api/revenue-intelligence/rep-performance
router.get('/rep-performance', auth, async (req, res) => {
  try {
    if (req.user.role === 'sales_rep') {
      return res.status(403).json({ error: 'Managers and admins only' });
    }

    const deals = await Deal.find({ isArchived: false })
      .populate('owner', 'firstName lastName email');

    const repMap = {};
    deals.forEach(deal => {
      if (!deal.owner) return;
      const key = deal.owner._id.toString();
      if (!repMap[key]) {
        repMap[key] = { rep: deal.owner, openDeals: 0, openValue: 0, wonDeals: 0, wonValue: 0, lostDeals: 0, totalRisk: 0, dealCount: 0 };
      }
      repMap[key].dealCount++;
      if (deal.stage === 'closed_won') { repMap[key].wonDeals++; repMap[key].wonValue += deal.value || 0; }
      else if (deal.stage === 'closed_lost') { repMap[key].lostDeals++; }
      else {
        repMap[key].openDeals++;
        repMap[key].openValue += deal.value || 0;
        repMap[key].totalRisk += calcRiskScore(deal).score;
      }
    });

    const reps = Object.values(repMap).map(r => ({
      ...r,
      winRate: r.wonDeals + r.lostDeals > 0 ? Math.round((r.wonDeals / (r.wonDeals + r.lostDeals)) * 100) : null,
      avgRisk: r.openDeals > 0 ? Math.round(r.totalRisk / r.openDeals) : 0
    }));

    res.json({ reps: reps.sort((a, b) => b.wonValue - a.wonValue) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get rep performance' });
  }
});

module.exports = router;
