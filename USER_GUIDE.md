# 📘 VelocityHub CRM - User Guide

Welcome to VelocityHub CRM! This guide will help you get the most out of your AI-powered CRM system.

---

## 🚀 Quick Start

### Access the Application

1. **Backend**: http://localhost:5001
2. **Frontend**: http://localhost:3000

### Default Login (Development)

If you haven't created an account yet, you can register at the login page.

---

## 🎯 Core Features

### 1. Dashboard
**Location**: Home (/)

**What you'll see**:
- Total revenue and monthly stats
- Pipeline health indicators
- Recent activity feed
- Quick action buttons

**Quick Actions**:
- View all leads, deals, and companies
- Access analytics and reports

---

### 2. Leads Management
**Location**: /leads

**Features**:
- View all leads in a sortable table
- Filter by status, source, or score
- Add new leads manually
- Import leads from CSV
- Bulk operations (assign, tag, delete)

**Lead Scoring**:
- Leads are automatically scored 0-100 based on:
  - Company size
  - Engagement level
  - Profile completeness
  - Industry match
  - Response rate

**Status Workflow**:
1. **New** → Just added to system
2. **Contacted** → Initial outreach made
3. **Qualified** → Meets criteria
4. **Proposal** → Proposal sent
5. **Negotiation** → In final stages
6. **Closed** → Deal won or lost

---

### 3. Pipeline (Deals)
**Location**: /pipeline

**Features**:
- Drag-and-drop Kanban board
- 6 pipeline stages
- Visual deal cards with values
- Stage-by-stage analytics
- Win rate calculation

**Pipeline Stages**:
1. Prospecting
2. Qualification
3. Proposal
4. Negotiation
5. Closed Won ✅
6. Closed Lost ❌

**How to use**:
- Drag deals between stages
- Click on a deal for details
- Add notes and activities
- Track deal probability

---

### 4. Companies
**Location**: /companies

**Features**:
- Beautiful header with background image
- Company health scores
- Contact and deal tracking
- Filter by industry and size

**Company Health Score** (0-100):
- Based on engagement frequency
- Number of active deals
- Revenue potential
- Contact responsiveness

---

## 🆕 Advanced Features

### 5. 🤖 Conversation Intelligence
**Location**: /conversation-intelligence

**What it does**:
Analyzes your sales conversations (calls, emails, meetings) using AI to extract insights and coaching tips.

**How to use**:
1. Click "Analyze Conversation"
2. Select conversation type (call, email, message, meeting)
3. Paste the transcript
4. Click "Analyze"

**What you get**:
- **Sentiment Analysis**: Positive, neutral, or negative
- **Key Insights**: Pain points, buying signals, objections
- **Action Items**: Automatic follow-up tasks
- **Talk Ratio**: Rep vs. customer talk time
- **Competitor Mentions**: Track competitive landscape
- **Deal Signals**: Buying intent and urgency scores
- **Risks**: Potential deal-breakers identified
- **Coaching Tips**: AI-generated improvement suggestions
- **Quality Score**: Overall conversation rating

**Best Practices**:
- Analyze every important call
- Review coaching tips weekly
- Track sentiment trends over time
- Share insights with your team

---

### 6. ⚙️ Workflow Automation
**Location**: /workflows

**What it does**:
Automates repetitive tasks based on triggers and conditions.

**Pre-built Templates**:

1. **High Score Lead Alert** 🔥
   - Trigger: Lead score reaches 80+
   - Actions: Send notification, create urgent task

2. **Inactive Lead Follow-up** 💤
   - Trigger: 7 days of inactivity
   - Actions: Add to re-engagement sequence

3. **Deal Won Celebration** 🎉
   - Trigger: Deal stage → Closed Won
   - Actions: Celebrate, create onboarding tasks, add tags

4. **Auto-assign New Leads** 👥
   - Trigger: New lead created
   - Actions: Round-robin assignment, create follow-up task

**How to create a workflow**:
1. Click "Use Template" or "Create Workflow"
2. Choose a template or start from scratch
3. Set trigger conditions
4. Add actions in sequence
5. Activate the workflow

**Available Triggers**:
- Record created
- Field updated
- Stage changed
- Score threshold
- Time-based (hourly, daily, weekly)
- Inactivity (X days)
- Tag added/removed
- Email opened/clicked
- Deal won/lost

**Available Actions**:
- Send email/SMS
- Create task/deal
- Add/remove tags
- Update fields
- Assign owner
- Change stage
- Send notification
- Add to email sequence
- Call webhook

**Monitoring**:
- View execution history
- Track success/failure rates
- Pause or edit active workflows

---

### 7. 📱 Social Media Integration
**Location**: /social-media

**What it does**:
Find, import, and track prospects from LinkedIn and Twitter.

**How to import profiles**:

**LinkedIn**:
1. Find a prospect's LinkedIn profile
2. Copy the profile URL
3. Paste in "LinkedIn Profile URL" field
4. Click "Import"
5. Optional: Auto-create lead

**Twitter**:
1. Find a prospect's Twitter profile
2. Enter their username (with or without @)
3. Click "Import"
4. Optional: Auto-create lead

**What gets tracked**:
- Profile information (name, headline, location)
- Professional details (company, position)
- Engagement metrics (followers, post frequency)
- Recent activity (posts, likes, shares)
- Engagement score (0-100)

**Buying Signals**:
- 🔄 Job changes
- 📈 Promotions
- 👥 Hiring posts
- ⚡ Active engagement
- 🎯 Relevant content sharing

**Engagement Score** (0-100):
- Very High (80+): Reach out immediately
- High (60-79): Great prospect, prioritize
- Medium (40-59): Good prospect
- Low (0-39): Monitor and engage with content first

**Best Practices**:
- Import prospects before reaching out
- Monitor for job changes (great timing!)
- Engage with their content first
- Use insights to personalize outreach
- Sync profiles weekly

---

### 8. 🔍 Lead Enrichment
**Location**: /lead-enrichment

**What it does**:
Automatically enriches lead data with verified contact info and company details from multiple sources.

**Features**:

**1. Enrich Leads**:
- Click "Enrich" on any lead
- Or select multiple leads → "Enrich Selected"
- System finds: email, phone, job title, company info

**2. Find Email**:
- Enter: First name, Last name, Company domain
- Get potential email addresses
- Confidence score provided

**3. Verify Email**:
- Enter any email address
- Get deliverability status
- Score 0-100 (90+ = excellent)

**Data Sources** (works with mock data, or connect real APIs):
- Clearbit: Contact & company enrichment
- Hunter.io: Email finding & verification
- Apollo.io: B2B contact database

**What gets enriched**:
- ✉️ Email addresses
- 📞 Phone numbers
- 💼 Job titles
- 🏢 Company details (revenue, employees, industry)
- 📍 Location data
- 🔗 Social profile links
- 🛠️ Tech stack used by company

**Usage Limits**:
- Free tier: 1,000 credits/month
- Each enrichment = 1 credit
- Email verification = 0.5 credits
- Monitor usage in dashboard

**Best Practices**:
- Enrich leads immediately after import
- Verify emails before sending campaigns
- Use bulk enrichment for large lists
- Check enrichment quality scores

---

## 📊 Analytics
**Location**: /analytics

**Metrics Available**:
- Total revenue & monthly revenue
- Pipeline value & weighted pipeline
- Win rate percentage
- Lead sources breakdown
- Deal stage distribution
- Conversion funnel
- Top performers leaderboard
- Revenue forecast

**Custom Reports**:
- Filter by date range
- Export to CSV
- Schedule email reports

---

## 💬 AI Chatbot
**Location**: Bottom right corner (all pages)

**What it can do**:
- Answer questions about VelocityHub features
- Provide quick help
- Guide you through processes
- 24/7 availability

**Example Questions**:
- "How do I create a workflow?"
- "What does the engagement score mean?"
- "How do I import leads from LinkedIn?"

---

## ⚙️ Settings & Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Required** (for basic functionality):
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

**Optional** (for full functionality):
```env
# AI Services
OPENAI_API_KEY=your_openai_key

# Social Media
LINKEDIN_CLIENT_ID=your_linkedin_id
TWITTER_API_KEY=your_twitter_key

# Lead Enrichment
CLEARBIT_API_KEY=your_clearbit_key
HUNTER_API_KEY=your_hunter_key

# Email/SMS
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
```

---

## 🎓 Best Practices

### Daily Workflow:
1. Check Dashboard for overview
2. Review high-priority tasks
3. Follow up on hot leads (80+ score)
4. Move deals in Pipeline
5. Analyze 1-2 important conversations
6. Respond to notifications

### Weekly Routine:
1. Review Conversation Intelligence insights
2. Check workflow execution stats
3. Import new social profiles
4. Bulk enrich new leads
5. Review analytics and adjust strategy
6. Update workflow rules as needed

### Monthly Tasks:
1. Analyze team performance
2. Review and optimize workflows
3. Check API usage and costs
4. Export data backups
5. Update lead scoring criteria

---

## 🔒 Security

**Data Protection**:
- All passwords hashed with bcrypt
- JWT authentication for API
- HTTPS encryption (in production)
- Role-based access control
- Regular automated backups

**Privacy**:
- GDPR compliant
- Data encryption at rest
- Audit trails for all actions
- User consent tracking

---

## 🆘 Troubleshooting

### Common Issues:

**1. Can't log in**:
- Check email/password
- Clear browser cache
- Check backend is running on port 5001

**2. Workflows not executing**:
- Check workflow status (must be "active")
- Verify trigger conditions
- Check execution limits
- Review recent executions for errors

**3. Social profiles not importing**:
- Verify URL format
- Check API keys configured
- Try with mock data first

**4. Lead enrichment failing**:
- Check API credits remaining
- Verify API keys
- Use mock data for testing

**5. Conversation analysis errors**:
- Ensure transcript is not empty
- Check OpenAI API key (or use default)
- Verify conversation type

---

## 📞 Support & Resources

### Documentation:
- `README.md` - Project overview
- `ADVANCED_FEATURES.md` - New features documentation
- `USER_GUIDE.md` - This file

### Getting Help:
1. Check documentation first
2. Use AI chatbot for quick questions
3. Review example workflows
4. Check API documentation

### Community:
- GitHub Issues: Report bugs
- Feature Requests: Suggest improvements
- Discussions: Share best practices

---

## 🎯 Success Metrics to Track

### Sales Performance:
- Win rate (target: 25%+)
- Average deal size (monitor trends)
- Sales cycle length (optimize workflows)
- Pipeline velocity

### Efficiency Gains:
- Time saved with automation
- Leads enriched automatically
- Conversations analyzed
- Tasks automated

### Quality Metrics:
- Lead score accuracy
- Email deliverability rate
- Conversation quality scores
- Customer satisfaction

---

## 💡 Pro Tips

1. **Use Keyboard Shortcuts**:
   - `Ctrl+K` - Quick search (coming soon)
   - `Esc` - Close modals

2. **Bulk Operations**:
   - Select multiple leads → enrich all at once
   - Saves time and credits

3. **Smart Workflows**:
   - Start with templates
   - Test with a few leads first
   - Monitor for 1 week before scaling

4. **Social Selling**:
   - Import before reaching out
   - Check engagement score first
   - Look for buying signals

5. **Conversation Analysis**:
   - Analyze all important calls
   - Review coaching tips weekly
   - Share insights with team

6. **Data Quality**:
   - Enrich leads within 24 hours
   - Verify emails before campaigns
   - Keep profiles updated

---

## 🎉 Welcome to VelocityHub!

You now have access to an enterprise-grade CRM with AI superpowers. Here's what makes it special:

✅ **AI-powered insights** on every conversation
✅ **Intelligent automation** saving 10+ hours/week
✅ **Social selling** tools to reach prospects at the right time
✅ **Data enrichment** for complete lead profiles
✅ **Real-time analytics** for data-driven decisions

### Your Next Steps:

1. ✅ Complete your profile setup
2. ✅ Import your first leads
3. ✅ Create your first workflow
4. ✅ Analyze a conversation
5. ✅ Import social profiles
6. ✅ Enrich your lead database

### Need Help?

Click the chat widget (bottom right) anytime for instant AI assistance!

---

**🚀 Build Velocity. Close Faster. Grow Smarter.**

*VelocityHub CRM - Powered by AI, Built for Sales Teams*

Version 2.0 | Last Updated: October 2025
