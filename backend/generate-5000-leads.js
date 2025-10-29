require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./src/models/Lead');
const User = require('./src/models/User');

// Realistic data for lead generation
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna',
  'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Alexander', 'Rachel', 'Frank', 'Catherine', 'Patrick', 'Carolyn', 'Raymond', 'Janet',
  'Jack', 'Ruth', 'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane',
  'Aaron', 'Virginia', 'Jose', 'Julie', 'Adam', 'Joyce', 'Henry', 'Victoria',
  'Nathan', 'Olivia', 'Douglas', 'Kelly', 'Zachary', 'Christina', 'Peter', 'Lauren'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell'
];

const companies = [
  'TechCorp Solutions', 'Global Dynamics Inc', 'Innovative Systems LLC', 'DataStream Technologies',
  'CloudNine Services', 'Quantum Analytics', 'Nexus Enterprises', 'Apex Industries',
  'Vertex Solutions', 'Fusion Technologies', 'Pinnacle Group', 'Summit Ventures',
  'Catalyst Corporation', 'Momentum Business Solutions', 'Synergy Systems', 'Precision Tech',
  'Digital Horizons', 'Elite Consulting Group', 'Prime Innovations', 'Vanguard Technologies',
  'Optima Solutions', 'Zenith Corporation', 'Radiant Systems', 'Cornerstone Enterprises',
  'Triumph Technologies', 'Legacy Solutions', 'Frontier Group', 'Paradigm Shift Inc',
  'Visionary Tech', 'Beacon Solutions', 'Insight Analytics', 'Elevated Consulting',
  'Streamline Systems', 'Navigate Technologies', 'Thrive Business Group', 'Excel Ventures',
  'Advance Corporation', 'Prosper Solutions', 'Ascend Technologies', 'Elevate Group',
  'Transform Industries', 'Evolve Systems', 'Pioneer Tech', 'Blueprint Solutions',
  'Gateway Corporation', 'Horizon Ventures', 'Infinite Technologies', 'Matrix Solutions',
  'Nexgen Industries', 'Omega Systems', 'Platinum Group', 'Quantum Leap Inc',
  'Stellar Technologies', 'Titan Corporation', 'Unity Solutions', 'Venture Systems',
  'Wavelength Tech', 'Xcel Innovations', 'Zephyr Enterprises', 'Acme Corporation',
  'Bridgestone Solutions', 'Cascade Technologies', 'Dynasty Group', 'Empire Industries'
];

const jobTitles = [
  // C-Level
  'CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CIO', 'Chief Revenue Officer', 'Chief Product Officer',
  // VP Level
  'VP of Sales', 'VP of Marketing', 'VP of Engineering', 'VP of Operations', 'VP of Finance',
  'VP of Product', 'VP of Customer Success', 'VP of Business Development',
  // Director Level
  'Director of Sales', 'Director of Marketing', 'Director of Engineering', 'Sales Director',
  'Marketing Director', 'IT Director', 'Operations Director', 'Finance Director',
  'Product Director', 'Customer Success Director', 'Business Development Director',
  // Manager Level
  'Sales Manager', 'Marketing Manager', 'Product Manager', 'Project Manager', 'Account Manager',
  'Customer Success Manager', 'Operations Manager', 'Engineering Manager', 'IT Manager',
  'Finance Manager', 'HR Manager', 'Business Development Manager', 'Regional Sales Manager',
  // Individual Contributors
  'Sales Representative', 'Account Executive', 'Business Development Representative',
  'Marketing Specialist', 'Product Manager', 'Software Engineer', 'Data Analyst',
  'Customer Success Specialist', 'Account Coordinator', 'Marketing Coordinator',
  'Sales Consultant', 'Business Analyst', 'Financial Analyst', 'Operations Coordinator'
];

const industries = [
  'Technology', 'Software', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
  'E-commerce', 'Consulting', 'Education', 'Real Estate', 'Insurance', 'Telecommunications',
  'Automotive', 'Aerospace', 'Biotechnology', 'Construction', 'Energy', 'Entertainment',
  'Food & Beverage', 'Hospitality', 'Legal Services', 'Logistics', 'Marketing & Advertising',
  'Media', 'Pharmaceutical', 'Professional Services', 'Transportation', 'Travel & Tourism'
];

const sources = ['website', 'referral', 'cold_call', 'email', 'social_media', 'event', 'partner'];

const statuses = ['new', 'contacted', 'qualified', 'unqualified'];

const cities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'San Francisco', 'Charlotte', 'Indianapolis', 'Seattle',
  'Denver', 'Washington', 'Boston', 'Nashville', 'Detroit', 'Portland',
  'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque',
  'Tucson', 'Fresno', 'Sacramento', 'Kansas City', 'Atlanta', 'Miami',
  'Oakland', 'Tulsa', 'Minneapolis', 'Cleveland', 'Wichita', 'Arlington',
  'Tampa', 'New Orleans', 'Bakersfield', 'Aurora', 'Honolulu', 'Anaheim',
  'Santa Ana', 'Riverside', 'Corpus Christi', 'Lexington', 'Pittsburgh', 'Anchorage',
  'Stockton', 'Cincinnati', 'Saint Paul', 'Toledo', 'Greensboro', 'Newark'
];

const states = [
  'CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI',
  'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI',
  'CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT',
  'IA', 'NV', 'AR', 'MS', 'KS', 'NM', 'NE', 'WV', 'ID', 'HI'
];

const companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

// Helper functions
const random = (array) => array[Math.floor(Math.random() * array.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (probability = 0.5) => Math.random() < probability;

const generateLead = (owner) => {
  const firstName = random(firstNames);
  const lastName = random(lastNames);
  const company = random(companies);
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  const phone = `+1${randomInt(200, 999)}${randomInt(200, 999)}${randomInt(1000, 9999)}`;

  // Generate realistic AI scores
  const engagement = randomInt(0, 100);
  const fit = randomInt(40, 100); // Most leads are at least somewhat fit
  const intent = randomInt(0, 100);
  const timing = randomInt(0, 100);
  const overall = Math.round((engagement * 0.25 + fit * 0.35 + intent * 0.25 + timing * 0.15));

  const lead = {
    firstName,
    lastName,
    email,
    phone: randomBool(0.8) ? phone : undefined, // 80% have phone
    company,
    jobTitle: random(jobTitles),
    website: randomBool(0.7) ? `https://${domain}` : undefined,
    industry: random(industries),
    companySize: random(companySizes),
    status: random(statuses),
    source: random(sources),
    owner,
    estimatedValue: randomInt(1000, 100000),
    description: randomBool(0.3) ? `Potential client interested in our services. ${random([
      'Met at trade show',
      'Downloaded whitepaper',
      'Requested demo',
      'Inquired about pricing',
      'Referred by existing customer',
      'Visited website multiple times'
    ])}` : undefined,
    address: {
      city: random(cities),
      state: random(states),
      country: 'United States'
    },
    socialMedia: {
      linkedin: randomBool(0.6) ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}` : undefined,
      twitter: randomBool(0.3) ? `https://twitter.com/${firstName.toLowerCase()}${lastName.toLowerCase()}` : undefined
    },
    // AI Score
    aiScore: {
      overall,
      engagement,
      fit,
      intent,
      timing,
      insights: {
        buyingSignals: overall > 70 ? [
          random(['High engagement with emails', 'Multiple website visits', 'Downloaded resources']),
          random(['Attended webinar', 'Requested pricing', 'Asked about implementation'])
        ] : [],
        concerns: overall < 40 ? [
          random(['Low engagement', 'Budget constraints', 'Timing not right']),
          random(['No decision maker contact', 'Competitor preference', 'No immediate need'])
        ] : [],
        nextBestAction: overall > 70 ? 'Schedule demo call' :
                        overall > 50 ? 'Send follow-up email' :
                        overall > 30 ? 'Nurture with content' :
                        'Re-qualify lead',
        expectedResponseTime: overall > 70 ? 'Within 24 hours' :
                              overall > 50 ? 'Within 3 days' :
                              overall > 30 ? 'Within 1 week' :
                              'Low priority',
        recommendedApproach: overall > 70 ? 'Direct outreach - high priority' :
                             overall > 50 ? 'Personalized email sequence' :
                             overall > 30 ? 'Add to nurture campaign' :
                             'Monitor for engagement signals'
      },
      lastScored: new Date()
    },
    // Engagement tracking
    engagement: {
      emailsOpened: randomInt(0, 10),
      emailsClicked: randomInt(0, 5),
      websiteVisits: randomInt(0, 20),
      lastEmailOpened: randomBool(0.5) ? new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000) : undefined,
      lastWebsiteVisit: randomBool(0.6) ? new Date(Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000) : undefined,
      lastContacted: randomBool(0.7) ? new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000) : undefined
    },
    tags: [],
    convertedToDeal: false,
    isArchived: false,
    createdAt: new Date(Date.now() - randomInt(0, 180) * 24 * 60 * 60 * 1000), // Random date within last 6 months
    updatedAt: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000) // Random date within last month
  };

  // Add some tags
  const possibleTags = ['hot-lead', 'warm-lead', 'cold-lead', 'decision-maker', 'champion',
                        'budget-approved', 'needs-nurturing', 'high-value', 'enterprise', 'smb'];
  const numTags = randomInt(0, 3);
  for (let i = 0; i < numTags; i++) {
    const tag = random(possibleTags);
    if (!lead.tags.includes(tag)) {
      lead.tags.push(tag);
    }
  }

  return lead;
};

async function generate5000Leads() {
  try {
    console.log('🚀 Starting lead generation...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/velocityhub', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Find or create a default user
    let user = await User.findOne({ email: 'admin@velocityhub.com' });

    if (!user) {
      console.log('Creating default admin user...');
      user = new User({
        name: 'Admin User',
        email: 'admin@velocityhub.com',
        password: 'admin123',
        role: 'admin',
        subscription: {
          tier: 'enterprise',
          status: 'active',
          startDate: new Date()
        }
      });
      user.updateLimits();
      await user.save();
      console.log('✅ Default admin user created');
      console.log('   Email: admin@velocityhub.com');
      console.log('   Password: admin123');
    }

    // Clear existing leads (optional)
    const existingCount = await Lead.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing leads. Clearing...`);
      await Lead.deleteMany({});
      console.log('✅ Existing leads cleared');
    }

    // Generate leads in batches
    const batchSize = 500;
    const totalLeads = 5000;
    const batches = Math.ceil(totalLeads / batchSize);

    console.log(`\n📊 Generating ${totalLeads} leads in ${batches} batches of ${batchSize}...\n`);

    for (let batch = 0; batch < batches; batch++) {
      const leads = [];
      const leadsInBatch = Math.min(batchSize, totalLeads - (batch * batchSize));

      for (let i = 0; i < leadsInBatch; i++) {
        leads.push(generateLead(user._id));
      }

      await Lead.insertMany(leads);

      const progress = ((batch + 1) / batches * 100).toFixed(1);
      const completed = (batch + 1) * batchSize;
      console.log(`✅ Batch ${batch + 1}/${batches} complete (${Math.min(completed, totalLeads)}/${totalLeads} leads - ${progress}%)`);
    }

    // Generate statistics
    console.log('\n📈 Lead Generation Statistics:');
    console.log('═══════════════════════════════════════════════');

    const stats = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('\n📊 By Status:');
    stats.forEach(s => console.log(`   ${s._id}: ${s.count}`));

    const sourceStats = await Lead.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    console.log('\n📍 By Source:');
    sourceStats.forEach(s => console.log(`   ${s._id}: ${s.count}`));

    const avgScore = await Lead.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$aiScore.overall' } } }
    ]);

    console.log(`\n🎯 Average AI Score: ${avgScore[0].avgScore.toFixed(1)}/100`);

    const highQuality = await Lead.countDocuments({ 'aiScore.overall': { $gte: 70 } });
    const medium = await Lead.countDocuments({ 'aiScore.overall': { $gte: 40, $lt: 70 } });
    const lowQuality = await Lead.countDocuments({ 'aiScore.overall': { $lt: 40 } });

    console.log('\n🎯 Lead Quality Distribution:');
    console.log(`   High Quality (70-100): ${highQuality} (${(highQuality/totalLeads*100).toFixed(1)}%)`);
    console.log(`   Medium Quality (40-69): ${medium} (${(medium/totalLeads*100).toFixed(1)}%)`);
    console.log(`   Low Quality (0-39): ${lowQuality} (${(lowQuality/totalLeads*100).toFixed(1)}%)`);

    console.log('\n═══════════════════════════════════════════════');
    console.log(`\n🎉 Successfully generated ${totalLeads} leads!`);
    console.log('\n💡 You can now:');
    console.log('   1. Start the backend: cd backend && npm start');
    console.log('   2. Login with: admin@velocityhub.com / admin123');
    console.log('   3. View leads via API: http://localhost:5001/api/leads');
    console.log('   4. Use the frontend to manage leads (once built)');
    console.log('\n✨ All leads include:');
    console.log('   - AI-powered scoring (0-100)');
    console.log('   - Realistic contact information');
    console.log('   - Company details');
    console.log('   - Engagement tracking');
    console.log('   - Multiple sources and statuses');
    console.log('   - Tags for categorization');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating leads:', error);
    process.exit(1);
  }
}

// Run the script
generate5000Leads();
