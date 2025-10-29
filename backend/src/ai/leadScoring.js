// AI Lead Scoring Service
// Automatically scores leads 0-100 based on multiple factors

class LeadScoringService {
  constructor() {
    // Scoring weights (total = 100)
    this.weights = {
      companySize: 20,        // Larger companies = higher score
      industry: 15,           // Target industries get boost
      engagement: 25,         // Email opens, clicks, website visits
      demographics: 15,       // Title, seniority level
      behavior: 15,           // Actions taken, pages visited
      timing: 10              // Recency of activity
    };

    // Target industries (get bonus points)
    this.targetIndustries = [
      'Technology',
      'Software',
      'SaaS',
      'Finance',
      'Healthcare',
      'E-commerce'
    ];

    // High-value titles
    this.highValueTitles = [
      'CEO', 'CTO', 'CFO', 'COO',
      'President', 'VP', 'Vice President',
      'Director', 'Head of', 'Manager',
      'Owner', 'Founder', 'Partner'
    ];
  }

  /**
   * Calculate lead score (0-100)
   * @param {Object} lead - Lead object
   * @param {Object} options - Additional options
   * @returns {Object} Scoring result
   */
  async calculateScore(lead, options = {}) {
    try {
      const scores = {
        companySize: this.scoreCompanySize(lead),
        industry: this.scoreIndustry(lead),
        engagement: this.scoreEngagement(lead),
        demographics: this.scoreDemographics(lead),
        behavior: this.scoreBehavior(lead),
        timing: this.scoreTiming(lead)
      };

      // Calculate weighted total
      const totalScore = Math.round(
        (scores.companySize * this.weights.companySize +
         scores.industry * this.weights.industry +
         scores.engagement * this.weights.engagement +
         scores.demographics * this.weights.demographics +
         scores.behavior * this.weights.behavior +
         scores.timing * this.weights.timing) / 100
      );

      // Determine quality grade
      const grade = this.getGrade(totalScore);

      // Generate insights
      const insights = this.generateInsights(lead, scores, totalScore);

      // Determine recommended actions
      const actions = this.getRecommendedActions(totalScore, scores);

      return {
        score: totalScore,
        grade,
        breakdown: scores,
        insights,
        actions,
        lastCalculated: new Date()
      };
    } catch (error) {
      console.error('Error calculating lead score:', error);
      throw error;
    }
  }

  /**
   * Score based on company size
   */
  scoreCompanySize(lead) {
    const company = lead.company;
    if (!company) return 30; // Default mid-score

    // Parse employee count
    let employees = 0;
    if (company.employeeCount) {
      if (typeof company.employeeCount === 'number') {
        employees = company.employeeCount;
      } else if (typeof company.employeeCount === 'string') {
        // Handle ranges like "50-100"
        const match = company.employeeCount.match(/(\d+)/);
        if (match) employees = parseInt(match[1]);
      }
    }

    // Score based on size
    if (employees >= 1000) return 100;      // Enterprise
    if (employees >= 500) return 90;        // Large
    if (employees >= 200) return 80;        // Mid-market
    if (employees >= 50) return 70;         // Small business
    if (employees >= 10) return 60;         // Startup
    if (employees > 0) return 40;           // Micro
    return 30;                              // Unknown
  }

  /**
   * Score based on industry
   */
  scoreIndustry(lead) {
    const industry = lead.company?.industry || lead.industry;
    if (!industry) return 50; // Default mid-score

    // Check if target industry
    const isTarget = this.targetIndustries.some(target =>
      industry.toLowerCase().includes(target.toLowerCase())
    );

    return isTarget ? 100 : 50;
  }

  /**
   * Score based on engagement
   */
  scoreEngagement(lead) {
    let score = 0;

    // Email engagement
    if (lead.engagement) {
      const { emailOpens = 0, emailClicks = 0, emailReplies = 0 } = lead.engagement;

      score += Math.min(emailOpens * 3, 30);    // Up to 30 points
      score += Math.min(emailClicks * 5, 30);   // Up to 30 points
      score += Math.min(emailReplies * 10, 40); // Up to 40 points
    }

    // Website visits
    if (lead.activities) {
      const websiteVisits = lead.activities.filter(a =>
        a.type === 'website_visit'
      ).length;
      score += Math.min(websiteVisits * 2, 20); // Up to 20 points
    }

    // Form submissions
    const formSubmissions = lead.activities?.filter(a =>
      a.type === 'form_submission'
    ).length || 0;
    score += Math.min(formSubmissions * 10, 30); // Up to 30 points

    return Math.min(score, 100);
  }

  /**
   * Score based on demographics
   */
  scoreDemographics(lead) {
    let score = 50; // Base score

    // Job title
    const title = lead.jobTitle || lead.title || '';
    const hasHighValueTitle = this.highValueTitles.some(hvt =>
      title.toLowerCase().includes(hvt.toLowerCase())
    );

    if (hasHighValueTitle) {
      score += 50;

      // Extra points for C-level
      if (/CEO|CFO|CTO|COO|Chief/i.test(title)) {
        score += 20;
      }
    }

    // Location (if targeting specific regions)
    if (lead.location?.country === 'United States') {
      score += 10;
    }

    // Phone number present
    if (lead.phone) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Score based on behavior
   */
  scoreBehavior(lead) {
    let score = 0;

    if (!lead.activities || lead.activities.length === 0) {
      return 20; // Base score for no activity
    }

    // Recent activity count
    const recentActivities = lead.activities.filter(a => {
      const activityDate = new Date(a.date || a.timestamp);
      const daysSince = (Date.now() - activityDate) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    score += Math.min(recentActivities.length * 5, 40); // Up to 40 points

    // High-intent activities
    const highIntentActivities = lead.activities.filter(a =>
      ['demo_request', 'pricing_page_visit', 'trial_signup', 'contact_form'].includes(a.type)
    );

    score += Math.min(highIntentActivities.length * 15, 60); // Up to 60 points

    // Downloaded content
    const downloads = lead.activities.filter(a => a.type === 'content_download');
    score += Math.min(downloads.length * 5, 20); // Up to 20 points

    return Math.min(score, 100);
  }

  /**
   * Score based on timing/recency
   */
  scoreTiming(lead) {
    const createdDate = new Date(lead.createdAt);
    const daysSinceCreated = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);

    // Most recent leads score highest
    if (daysSinceCreated <= 1) return 100;     // Today
    if (daysSinceCreated <= 3) return 90;      // Last 3 days
    if (daysSinceCreated <= 7) return 80;      // Last week
    if (daysSinceCreated <= 14) return 70;     // Last 2 weeks
    if (daysSinceCreated <= 30) return 60;     // Last month
    if (daysSinceCreated <= 60) return 40;     // Last 2 months
    if (daysSinceCreated <= 90) return 20;     // Last 3 months
    return 10;                                 // Older
  }

  /**
   * Get grade based on score
   */
  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  /**
   * Generate insights about the lead
   */
  generateInsights(lead, scores, totalScore) {
    const insights = [];

    // High score insights
    if (totalScore >= 80) {
      insights.push({
        type: 'positive',
        icon: '🔥',
        message: 'Hot lead! High priority for immediate follow-up.'
      });
    }

    // Company size insights
    if (scores.companySize >= 80) {
      insights.push({
        type: 'positive',
        icon: '🏢',
        message: 'Large company with significant budget potential.'
      });
    }

    // Industry insights
    if (scores.industry >= 90) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        message: 'Perfect fit for target industry.'
      });
    }

    // Engagement insights
    if (scores.engagement >= 70) {
      insights.push({
        type: 'positive',
        icon: '⚡',
        message: 'Highly engaged with multiple touchpoints.'
      });
    } else if (scores.engagement < 30) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: 'Low engagement. Consider nurture campaign.'
      });
    }

    // Demographics insights
    if (scores.demographics >= 80) {
      insights.push({
        type: 'positive',
        icon: '👔',
        message: 'Decision-maker with authority to purchase.'
      });
    }

    // Behavior insights
    if (scores.behavior >= 70) {
      insights.push({
        type: 'positive',
        icon: '🎬',
        message: 'Showing strong buying signals and intent.'
      });
    }

    // Timing insights
    if (scores.timing >= 80) {
      insights.push({
        type: 'info',
        icon: '⏰',
        message: 'Fresh lead - strike while the iron is hot.'
      });
    } else if (scores.timing < 30) {
      insights.push({
        type: 'warning',
        icon: '🕐',
        message: 'Aging lead - may need re-engagement.'
      });
    }

    return insights;
  }

  /**
   * Get recommended actions
   */
  getRecommendedActions(totalScore, scores) {
    const actions = [];

    if (totalScore >= 80) {
      actions.push({
        priority: 'urgent',
        action: 'Schedule a call or demo immediately',
        reason: 'High-quality lead with strong buying signals'
      });
      actions.push({
        priority: 'high',
        action: 'Send personalized proposal',
        reason: 'Lead is primed for conversion'
      });
    } else if (totalScore >= 60) {
      actions.push({
        priority: 'high',
        action: 'Engage with targeted content',
        reason: 'Good lead that needs more nurturing'
      });
      actions.push({
        priority: 'medium',
        action: 'Add to email sequence',
        reason: 'Build relationship over time'
      });
    } else if (totalScore >= 40) {
      actions.push({
        priority: 'medium',
        action: 'Add to nurture campaign',
        reason: 'Potential but needs development'
      });
      actions.push({
        priority: 'low',
        action: 'Monitor engagement',
        reason: 'Wait for stronger signals'
      });
    } else {
      actions.push({
        priority: 'low',
        action: 'Add to long-term nurture',
        reason: 'Low priority - focus on higher-scoring leads first'
      });
    }

    // Specific actions based on low scores
    if (scores.engagement < 30) {
      actions.push({
        priority: 'medium',
        action: 'Launch re-engagement campaign',
        reason: 'Low engagement needs attention'
      });
    }

    if (scores.demographics < 40 && !lead.phone) {
      actions.push({
        priority: 'medium',
        action: 'Enrich lead data',
        reason: 'Missing key information'
      });
    }

    return actions;
  }

  /**
   * Batch score multiple leads
   */
  async batchScore(leads, options = {}) {
    const results = [];

    for (const lead of leads) {
      try {
        const scoring = await this.calculateScore(lead, options);
        results.push({
          leadId: lead._id,
          ...scoring
        });
      } catch (error) {
        console.error(`Error scoring lead ${lead._id}:`, error);
        results.push({
          leadId: lead._id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get score thresholds for filtering
   */
  getThresholds() {
    return {
      hot: 80,      // 80-100: Hot leads
      warm: 60,     // 60-79: Warm leads
      cold: 40,     // 40-59: Cold leads
      poor: 0       // 0-39: Poor quality leads
    };
  }
}

module.exports = new LeadScoringService();
