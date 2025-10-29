# VelocityHub CRM - Lead Management Guide

## 🚀 Quick Start

### Step 1: Generate 5000 Leads

```bash
cd backend
npm install
node generate-5000-leads.js
```

This will:
- ✅ Create 5000 realistic leads with AI scores
- ✅ Create admin user (admin@velocityhub.com / admin123)
- ✅ Populate diverse industries, job titles, and companies
- ✅ Add engagement data and tags
- ✅ Include AI-powered lead scoring (0-100)

### Step 2: Start the Backend

```bash
# Create .env file
cp .env.example .env

# Start MongoDB and Redis (if using Docker)
docker-compose -f docker-compose.dev.yml up -d

# Start the server
npm start
```

Server runs on: `http://localhost:5001`

---

## 📝 Complete CRUD Operations

### Authentication First

All lead operations require authentication. Get your token first:

```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@velocityhub.com",
    "password": "admin123"
  }'

# Response includes token:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Use this token in all requests:**
```bash
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ CREATE - Add New Lead

### Create Single Lead

```bash
curl -X POST http://localhost:5001/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+15551234567",
    "company": "Acme Corp",
    "jobTitle": "VP of Sales",
    "industry": "Technology",
    "companySize": "51-200",
    "source": "website",
    "estimatedValue": 50000,
    "description": "Interested in our enterprise plan",
    "tags": ["hot-lead", "decision-maker"]
  }'
```

**Response:**
```json
{
  "lead": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "status": "new",
    "aiScore": {
      "overall": 50,
      "engagement": 0,
      "fit": 0,
      "intent": 0,
      "timing": 0
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    ...
  }
}
```

### Bulk Import Leads (CSV/API)

```bash
# Coming soon - import from CSV
curl -X POST http://localhost:5001/api/leads/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@leads.csv"
```

---

## 📖 READ - View Leads

### Get All Leads (with pagination)

```bash
curl -X GET "http://localhost:5001/api/leads?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50, max: 100)
- `status` - Filter by status (new, contacted, qualified, unqualified, converted, lost)
- `source` - Filter by source (website, referral, cold_call, email, social_media, event, partner)
- `search` - Search in name, email, or company
- `sort` - Sort field (e.g., `-createdAt`, `aiScore.overall`, `firstName`)

**Examples:**

```bash
# Get high-quality leads (AI score 70+)
curl -X GET "http://localhost:5001/api/leads?sort=-aiScore.overall&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search for specific company
curl -X GET "http://localhost:5001/api/leads?search=TechCorp" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:5001/api/leads?status=qualified&page=1&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by source
curl -X GET "http://localhost:5001/api/leads?source=website" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Single Lead

```bash
curl -X GET http://localhost:5001/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response includes:**
- Full contact information
- AI score breakdown
- Engagement metrics
- Notes and activities
- Related deal (if converted)

### Get Lead Statistics

```bash
curl -X GET http://localhost:5001/api/leads/stats/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "total": 5000,
  "byStatus": {
    "new": 1250,
    "contacted": 1875,
    "qualified": 1125,
    "unqualified": 750
  },
  "bySource": {
    "website": 1429,
    "referral": 714,
    "cold_call": 714,
    "email": 714,
    "social_media": 714,
    "event": 357,
    "partner": 358
  },
  "recentlyCreated": 150,
  "averageAIScore": 52.3
}
```

---

## ✏️ UPDATE - Edit Lead

### Update Single Lead

```bash
curl -X PATCH http://localhost:5001/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "qualified",
    "phone": "+15559876543",
    "estimatedValue": 75000,
    "tags": ["hot-lead", "decision-maker", "budget-approved"]
  }'
```

**Updatable Fields:**
- `firstName`, `lastName`, `email`, `phone`
- `company`, `jobTitle`, `website`, `industry`, `companySize`
- `status` - new, contacted, qualified, unqualified, converted, lost
- `source` - website, referral, cold_call, email, social_media, event, partner
- `estimatedValue`
- `description`
- `tags` - array of strings
- `address` - { street, city, state, zipCode, country }
- `socialMedia` - { linkedin, twitter, facebook }
- `qualificationCriteria` - { budget, authority, need, timeline }
- `customFields` - any custom data object

### Add Note to Lead

```bash
curl -X POST http://localhost:5001/api/leads/LEAD_ID/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Had great conversation. Ready to schedule demo next week."
  }'
```

### Convert Lead to Deal

```bash
curl -X POST http://localhost:5001/api/leads/LEAD_ID/convert \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This marks the lead as converted and creates a deal (full implementation in MVP).

---

## 🗑️ DELETE - Remove Lead

### Delete Single Lead (Soft Delete)

```bash
curl -X DELETE http://localhost:5001/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Note:** This performs a soft delete (marks as archived). The lead can be recovered.

**Response:**
```json
{
  "message": "Lead deleted successfully"
}
```

---

## 🔄 BULK OPERATIONS

### Bulk Update Status

```bash
curl -X POST http://localhost:5001/api/leads/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_status",
    "leadIds": ["LEAD_ID_1", "LEAD_ID_2", "LEAD_ID_3"],
    "data": {
      "status": "qualified"
    }
  }'
```

### Bulk Delete

```bash
curl -X POST http://localhost:5001/api/leads/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "leadIds": ["LEAD_ID_1", "LEAD_ID_2", "LEAD_ID_3"]
  }'
```

### Bulk Assign Owner

```bash
curl -X POST http://localhost:5001/api/leads/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "assign",
    "leadIds": ["LEAD_ID_1", "LEAD_ID_2"],
    "data": {
      "owner": "USER_ID"
    }
  }'
```

### Bulk Add Tag

```bash
curl -X POST http://localhost:5001/api/leads/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_tag",
    "leadIds": ["LEAD_ID_1", "LEAD_ID_2"],
    "data": {
      "tag": "high-priority"
    }
  }'
```

**Supported Bulk Actions:**
- `delete` - Soft delete multiple leads
- `update_status` - Change status for multiple leads
- `assign` - Reassign owner for multiple leads
- `add_tag` - Add tag to multiple leads

---

## 🤖 AI Features

### AI Lead Scoring

All leads automatically get AI scores (0-100) based on:

1. **Engagement Score (25%)** - Email opens, website visits, content downloads
2. **Fit Score (35%)** - Company size, industry, job title match
3. **Intent Score (25%)** - Buying signals, questions asked, timing indicators
4. **Timing Score (15%)** - Budget cycle, current solutions expiry, urgency signals

**Score Ranges:**
- 70-100: High Quality (hot leads - immediate follow-up)
- 40-69: Medium Quality (nurture and qualify)
- 0-39: Low Quality (long-term nurture or disqualify)

### AI Insights Included

Each lead has AI-generated insights:

```json
{
  "aiScore": {
    "overall": 75,
    "engagement": 80,
    "fit": 85,
    "intent": 70,
    "timing": 60,
    "insights": {
      "buyingSignals": [
        "High engagement with emails",
        "Requested pricing"
      ],
      "concerns": [],
      "nextBestAction": "Schedule demo call",
      "expectedResponseTime": "Within 24 hours",
      "recommendedApproach": "Direct outreach - high priority"
    }
  }
}
```

---

## 📊 Advanced Filtering & Search

### Filter by AI Score

```bash
# High-quality leads only
curl -X GET "http://localhost:5001/api/leads?sort=-aiScore.overall&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Complex Search Queries

```bash
# Search across multiple fields
curl -X GET "http://localhost:5001/api/leads?search=technology" \
  -H "Authorization: Bearer YOUR_TOKEN"

# This searches: firstName, lastName, email, company
```

### Combine Multiple Filters

```bash
curl -X GET "http://localhost:5001/api/leads?status=qualified&source=website&sort=-aiScore.overall" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Common Use Cases

### 1. Find Hot Leads for Today

```bash
# Get top 20 highest-scoring leads that haven't been contacted recently
curl -X GET "http://localhost:5001/api/leads?status=new&sort=-aiScore.overall&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Follow Up on Qualified Leads

```bash
# Get all qualified leads
curl -X GET "http://localhost:5001/api/leads?status=qualified&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Nurture Campaign List

```bash
# Get medium-quality leads for nurture campaign
# (Filter client-side for aiScore 40-69)
curl -X GET "http://localhost:5001/api/leads?status=contacted&limit=500" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Clean Up Old Leads

```bash
# Get unqualified leads older than 90 days
# (Filter client-side by date)
curl -X GET "http://localhost:5001/api/leads?status=unqualified" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔐 Permissions

**Admin & Manager:**
- Full access to all leads
- Bulk operations
- Delete leads
- Assign leads to others

**Sales Rep:**
- View only their own leads
- Create new leads
- Update their leads
- Add notes
- Convert to deals

**Support:**
- Read-only access to leads
- Can add notes

---

## 💡 Pro Tips

### 1. Use AI Scores Strategically

```bash
# Morning routine: Get your top 10 hottest leads
curl -X GET "http://localhost:5001/api/leads?status=new&sort=-aiScore.overall&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Tag Your Leads

Use tags to organize and segment:
- `hot-lead`, `warm-lead`, `cold-lead`
- `decision-maker`, `champion`, `blocker`
- `budget-approved`, `needs-approval`
- `q1-close`, `q2-close`, `q3-close`, `q4-close`
- `enterprise`, `smb`, `startup`

### 3. Track Engagement

Update engagement data when:
- Lead opens email → increment `emailsOpened`
- Lead clicks link → increment `emailsClicked`
- Lead visits website → increment `websiteVisits`, update `lastWebsiteVisit`
- You contact them → update `lastContacted`

### 4. Regular Data Quality

- Remove duplicates weekly
- Archive lost leads monthly
- Update AI scores for active leads
- Clean up unengaged leads quarterly

---

## 🚀 Next Steps

1. **Build Frontend** - React interface for visual lead management
2. **Add Email Integration** - Sync with Gmail/Outlook
3. **Enable Lead Scoring Automation** - Auto-update scores based on activity
4. **Implement Lead Assignment Rules** - Auto-assign based on territory/industry
5. **Add Lead Scoring Webhooks** - Notify when lead reaches high score

---

## 📞 Need Help?

- **API Documentation**: See full API docs at `/api/docs` (coming soon)
- **AI Chat Support**: Use the built-in chatbot (once frontend is ready)
- **Email**: support@velocityhub.com

---

**Pro Tip:** The 5000 generated leads include realistic data across all industries, company sizes, and quality scores. Perfect for testing, demos, and training!

