const axios = require('axios');
const Lead = require('../models/Lead');
const LeadOrder = require('../models/LeadOrder');
const logger = require('../utils/logger');

// Verified Lead Generation Service - Apollo.io & ZoomInfo Integration
class LeadGenerationService {
  constructor() {
    this.apolloApiKey = process.env.APOLLO_API_KEY;
    this.zoomInfoUsername = process.env.ZOOMINFO_USERNAME;
    this.zoomInfoPassword = process.env.ZOOMINFO_PASSWORD;
    this.zoomInfoToken = null;
  }

  // Process lead order
  async processLeadOrder(orderId) {
    try {
      const order = await LeadOrder.findById(orderId).populate('customer.userId');

      if (!order) {
        throw new Error('Order not found');
      }

      logger.info(`Processing lead order: ${order.orderNumber}`);

      order.status = 'processing';
      order.processing.startedAt = new Date();
      await order.save();

      // Determine which provider to use
      const provider = order.source.provider;
      let leads = [];

      if (provider === 'apollo') {
        leads = await this.fetchFromApollo(order);
      } else if (provider === 'zoominfo') {
        leads = await this.fetchFromZoomInfo(order);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Validate and enrich leads
      const validatedLeads = await this.validateLeads(leads, order);

      // Import leads to CRM
      if (order.delivery.method === 'direct_import') {
        await this.importLeadsToCRM(validatedLeads, order);
      } else if (order.delivery.method === 'csv_export') {
        await this.exportLeadsToCSV(validatedLeads, order);
      }

      // Update order
      order.status = 'delivered';
      order.delivery.deliveredAt = new Date();
      order.processing.completedAt = new Date();
      order.processing.duration = Math.floor((order.processing.completedAt - order.processing.startedAt) / 1000);

      await order.save();

      logger.info(`Lead order completed: ${order.orderNumber} - ${validatedLeads.length} leads delivered`);

      return {
        success: true,
        orderNumber: order.orderNumber,
        leadsDelivered: validatedLeads.length
      };
    } catch (error) {
      logger.error(`Error processing lead order: ${error.message}`);

      // Update order with error
      const order = await LeadOrder.findById(orderId);
      if (order) {
        order.status = 'failed';
        order.delivery.failureReason = error.message;
        order.processing.errors.push({
          stage: 'processing',
          error: error.message,
          timestamp: new Date()
        });
        await order.save();
      }

      throw error;
    }
  }

  // Fetch leads from Apollo.io
  async fetchFromApollo(order) {
    try {
      logger.info('Fetching leads from Apollo.io');

      const { specification } = order;

      // Build Apollo search query
      const searchParams = {
        api_key: this.apolloApiKey,
        // Industry
        organization_industry_tag_ids: specification.industries || [],
        // Company size
        organization_num_employees_ranges: this.convertCompanySizeToApolloFormat(specification.companySize),
        // Location
        person_locations: specification.locations?.countries || [],
        // Job titles
        person_titles: specification.jobTitles || [],
        // Department
        person_seniorities: specification.departments || [],
        // Technologies
        organization_technologies: specification.technologies || [],
        // Pagination
        page: 1,
        per_page: Math.min(order.package.quantity, 100),
        // Data quality
        contact_email_status: ['verified'],
        person_not_null: ['email', 'phone']
      };

      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search',
        searchParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      // Track API call
      order.processing.apiCalls.push({
        provider: 'apollo',
        endpoint: '/v1/mixed_people/search',
        timestamp: new Date(),
        responseTime: response.headers['x-response-time'] || 0,
        recordsReturned: response.data.people?.length || 0,
        success: true
      });

      const leads = response.data.people.map(person => this.convertApolloToLead(person));

      logger.info(`Fetched ${leads.length} leads from Apollo.io`);

      return leads;
    } catch (error) {
      logger.error(`Apollo.io API error: ${error.message}`);

      // Track failed API call
      order.processing.apiCalls.push({
        provider: 'apollo',
        endpoint: '/v1/mixed_people/search',
        timestamp: new Date(),
        success: false,
        error: error.message
      });

      throw new Error(`Failed to fetch leads from Apollo: ${error.message}`);
    }
  }

  // Fetch leads from ZoomInfo
  async fetchFromZoomInfo(order) {
    try {
      logger.info('Fetching leads from ZoomInfo');

      // Authenticate first
      if (!this.zoomInfoToken) {
        await this.authenticateZoomInfo();
      }

      const { specification } = order;

      // Build ZoomInfo search query
      const searchParams = {
        // Industry
        companyIndustry: specification.industries || [],
        // Company size
        companyEmployeeCount: {
          min: this.getMinEmployees(specification.companySize?.[0]),
          max: this.getMaxEmployees(specification.companySize?.[0])
        },
        // Location
        personLocation: {
          country: specification.locations?.countries || []
        },
        // Job titles
        personJobTitle: specification.jobTitles || [],
        // Department
        personDepartment: specification.departments || [],
        // Revenue
        companyRevenue: specification.revenueRange ? {
          min: specification.revenueRange.min,
          max: specification.revenueRange.max
        } : undefined,
        // Technologies
        companyTechnology: specification.technologies || [],
        // Page size
        maxResults: Math.min(order.package.quantity, 100),
        // Verified contacts only
        hasVerifiedEmail: true,
        hasDirectPhone: true
      };

      const response = await axios.post(
        'https://api.zoominfo.com/search/contact',
        searchParams,
        {
          headers: {
            'Authorization': `Bearer ${this.zoomInfoToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Track API call
      order.processing.apiCalls.push({
        provider: 'zoominfo',
        endpoint: '/search/contact',
        timestamp: new Date(),
        recordsReturned: response.data.data?.length || 0,
        success: true
      });

      const leads = response.data.data.map(person => this.convertZoomInfoToLead(person));

      logger.info(`Fetched ${leads.length} leads from ZoomInfo`);

      return leads;
    } catch (error) {
      logger.error(`ZoomInfo API error: ${error.message}`);

      // Track failed API call
      order.processing.apiCalls.push({
        provider: 'zoominfo',
        endpoint: '/search/contact',
        timestamp: new Date(),
        success: false,
        error: error.message
      });

      throw new Error(`Failed to fetch leads from ZoomInfo: ${error.message}`);
    }
  }

  // Authenticate with ZoomInfo
  async authenticateZoomInfo() {
    try {
      const response = await axios.post('https://api.zoominfo.com/authenticate', {
        username: this.zoomInfoUsername,
        password: this.zoomInfoPassword
      });

      this.zoomInfoToken = response.data.jwt;
      logger.info('ZoomInfo authentication successful');
    } catch (error) {
      logger.error(`ZoomInfo authentication failed: ${error.message}`);
      throw error;
    }
  }

  // Convert Apollo person to lead format
  convertApolloToLead(person) {
    return {
      sourceId: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      email: person.email,
      phone: person.phone_numbers?.[0]?.raw_number,
      jobTitle: person.title,
      company: person.organization?.name,
      website: person.organization?.website_url,
      industry: person.organization?.industry,
      companySize: this.convertEmployeeCount(person.organization?.estimated_num_employees),
      address: {
        city: person.city,
        state: person.state,
        country: person.country
      },
      socialMedia: {
        linkedin: person.linkedin_url,
        twitter: person.twitter_url,
        facebook: person.facebook_url
      },
      enrichment: {
        socialProfiles: {
          linkedin: person.linkedin_url,
          twitter: person.twitter_url,
          facebook: person.facebook_url
        },
        companyInfo: {
          name: person.organization?.name,
          website: person.organization?.website_url,
          industry: person.organization?.industry,
          employees: person.organization?.estimated_num_employees,
          revenue: person.organization?.estimated_annual_revenue,
          founded: person.organization?.founded_year,
          phone: person.organization?.phone,
          technologies: person.organization?.technologies || []
        },
        technographics: person.organization?.technologies || []
      },
      quality: {
        emailValid: person.email_status === 'verified',
        phoneValid: person.phone_numbers?.length > 0,
        dataComplete: this.calculateCompleteness(person),
        lastVerified: new Date()
      }
    };
  }

  // Convert ZoomInfo person to lead format
  convertZoomInfoToLead(person) {
    return {
      sourceId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.directPhoneNumber,
      jobTitle: person.jobTitle,
      company: person.company?.companyName,
      website: person.company?.website,
      industry: person.company?.industry,
      companySize: this.convertEmployeeCount(person.company?.employeeCount),
      address: {
        street: person.company?.street,
        city: person.company?.city,
        state: person.company?.state,
        zipCode: person.company?.zipCode,
        country: person.company?.country
      },
      socialMedia: {
        linkedin: person.linkedInUrl
      },
      enrichment: {
        socialProfiles: {
          linkedin: person.linkedInUrl
        },
        companyInfo: {
          name: person.company?.companyName,
          website: person.company?.website,
          industry: person.company?.industry,
          employees: person.company?.employeeCount,
          revenue: person.company?.revenue,
          phone: person.company?.phone,
          technologies: person.company?.technologies || []
        },
        technographics: person.company?.technologies || []
      },
      quality: {
        emailValid: person.hasVerifiedEmail,
        phoneValid: !!person.directPhoneNumber,
        dataComplete: this.calculateCompleteness(person),
        lastVerified: new Date()
      }
    };
  }

  // Validate leads
  async validateLeads(leads, order) {
    logger.info(`Validating ${leads.length} leads`);

    const validated = [];
    const validation = {
      emailVerified: 0,
      phoneVerified: 0,
      dataCompleteness: 0,
      duplicatesRemoved: 0
    };

    // Check for duplicates
    const existingLeads = await Lead.find({
      email: { $in: leads.map(l => l.email) }
    });

    const existingEmails = new Set(existingLeads.map(l => l.email));

    for (const lead of leads) {
      // Skip duplicates
      if (existingEmails.has(lead.email)) {
        validation.duplicatesRemoved++;
        continue;
      }

      // Count valid emails and phones
      if (lead.quality.emailValid) validation.emailVerified++;
      if (lead.quality.phoneValid) validation.phoneVerified++;
      validation.dataCompleteness += lead.quality.dataComplete;

      validated.push(lead);
    }

    // Calculate average completeness
    if (validated.length > 0) {
      validation.dataCompleteness = Math.round(validation.dataCompleteness / validated.length);
    }

    // Update order validation
    order.quality.validation = validation;
    await order.save();

    logger.info(`Validation complete: ${validated.length} valid leads, ${validation.duplicatesRemoved} duplicates removed`);

    return validated;
  }

  // Import leads to CRM
  async importLeadsToCRM(leads, order) {
    try {
      logger.info(`Importing ${leads.length} leads to CRM`);

      const importedLeads = [];

      for (const leadData of leads) {
        const lead = new Lead({
          ...leadData,
          owner: order.customer.userId,
          source: 'purchased',
          status: 'new',
          estimatedValue: order.package.pricePerLead * 100, // Rough estimate
          tags: ['purchased', order.source.provider]
        });

        await lead.save();

        // Track in order
        order.leadsDelivered.push({
          leadId: lead._id,
          sourceId: leadData.sourceId,
          deliveredAt: new Date(),
          quality: leadData.quality,
          enrichment: leadData.enrichment
        });

        importedLeads.push(lead);
      }

      order.delivery.importedCount = importedLeads.length;
      order.delivery.importedLeads = importedLeads.map(l => l._id);

      await order.save();

      logger.info(`Imported ${importedLeads.length} leads to CRM`);

      return importedLeads;
    } catch (error) {
      logger.error(`Error importing leads: ${error.message}`);
      throw error;
    }
  }

  // Export leads to CSV
  async exportLeadsToCSV(leads, order) {
    // This would generate a CSV file and upload to S3/Cloudinary
    // Simplified for now
    logger.info(`Exporting ${leads.length} leads to CSV`);

    const csvData = this.convertToCSV(leads);
    const exportUrl = `https://exports.velocityhub.com/${order.orderNumber}.csv`;

    order.delivery.exportUrl = exportUrl;
    order.delivery.exportedAt = new Date();

    await order.save();

    return exportUrl;
  }

  // Helper methods

  convertCompanySizeToApolloFormat(sizes) {
    const mapping = {
      '1-10': '1,10',
      '11-50': '11,50',
      '51-200': '51,200',
      '201-500': '201,500',
      '501-1000': '501,1000',
      '1000+': '1001,10000'
    };

    return (sizes || []).map(size => mapping[size]).filter(Boolean);
  }

  getMinEmployees(size) {
    const mapping = {
      '1-10': 1,
      '11-50': 11,
      '51-200': 51,
      '201-500': 201,
      '501-1000': 501,
      '1000+': 1001
    };

    return mapping[size] || 1;
  }

  getMaxEmployees(size) {
    const mapping = {
      '1-10': 10,
      '11-50': 50,
      '51-200': 200,
      '201-500': 500,
      '501-1000': 1000,
      '1000+': 999999
    };

    return mapping[size] || 999999;
  }

  convertEmployeeCount(count) {
    if (!count) return null;
    if (count <= 10) return '1-10';
    if (count <= 50) return '11-50';
    if (count <= 200) return '51-200';
    if (count <= 500) return '201-500';
    if (count <= 1000) return '501-1000';
    return '1000+';
  }

  calculateCompleteness(person) {
    let score = 0;
    const fields = [
      person.firstName,
      person.lastName || person.last_name,
      person.email,
      person.phone || person.phone_numbers,
      person.jobTitle || person.title,
      person.company || person.organization,
      person.linkedin || person.linkedin_url || person.linkedInUrl
    ];

    fields.forEach(field => {
      if (field) score += 14.28; // 100 / 7 fields
    });

    return Math.round(score);
  }

  convertToCSV(leads) {
    // Simplified CSV generation
    const headers = 'First Name,Last Name,Email,Phone,Job Title,Company,Website,Industry,City,State,Country,LinkedIn';
    const rows = leads.map(lead => {
      return [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.jobTitle,
        lead.company,
        lead.website,
        lead.industry,
        lead.address?.city,
        lead.address?.state,
        lead.address?.country,
        lead.socialMedia?.linkedin
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }
}

module.exports = new LeadGenerationService();
