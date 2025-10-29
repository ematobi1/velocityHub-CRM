/**
 * Lead Enrichment Service
 * Enriches lead data from multiple sources (Clearbit, Hunter, Apollo, ZoomInfo)
 */

const Lead = require('../models/Lead');
const Company = require('../models/Company');
const logger = require('../utils/logger');
const axios = require('axios');

class LeadEnrichmentService {
  constructor() {
    this.sources = {
      clearbit: {
        apiKey: process.env.CLEARBIT_API_KEY,
        baseUrl: 'https://person.clearbit.com/v2'
      },
      hunter: {
        apiKey: process.env.HUNTER_API_KEY,
        baseUrl: 'https://api.hunter.io/v2'
      },
      apollo: {
        apiKey: process.env.APOLLO_API_KEY,
        baseUrl: 'https://api.apollo.io/v1'
      }
    };
  }

  /**
   * Enrich a lead with data from all available sources
   */
  async enrichLead(leadId, options = {}) {
    try {
      const lead = await Lead.findById(leadId);

      if (!lead) {
        throw new Error('Lead not found');
      }

      logger.info(`Enriching lead: ${lead.email}`);

      const enrichedData = {
        personal: {},
        professional: {},
        company: {},
        social: {},
        contact: {},
        demographics: {},
        technographics: []
      };

      // Enrich from each source
      if (lead.email) {
        // Clearbit enrichment
        try {
          const clearbitData = await this.enrichFromClearbit(lead.email);
          this.mergeClearbitData(enrichedData, clearbitData);
        } catch (error) {
          logger.warn('Clearbit enrichment failed:', error.message);
        }

        // Hunter.io enrichment
        try {
          const hunterData = await this.enrichFromHunter(lead.email);
          this.mergeHunterData(enrichedData, hunterData);
        } catch (error) {
          logger.warn('Hunter enrichment failed:', error.message);
        }
      }

      if (lead.company) {
        // Company enrichment
        try {
          const companyData = await this.enrichCompany(lead.company);
          this.mergeCompanyData(enrichedData, companyData);
        } catch (error) {
          logger.warn('Company enrichment failed:', error.message);
        }
      }

      // Update lead with enriched data
      await this.applyEnrichedDataToLead(lead, enrichedData);

      // Mark as enriched
      if (!lead.tags) lead.tags = [];
      if (!lead.tags.includes('enriched')) {
        lead.tags.push('enriched');
      }

      await lead.save();

      logger.info(`Lead enriched successfully: ${leadId}`);

      return {
        lead,
        enrichedData,
        sources: this.getSourcesUsed(enrichedData)
      };
    } catch (error) {
      logger.error('Lead enrichment error:', error);
      throw error;
    }
  }

  /**
   * Enrich from Clearbit (mock implementation)
   */
  async enrichFromClearbit(email) {
    // In production, make real API call
    // const response = await axios.get(`${this.sources.clearbit.baseUrl}/people/find`, {
    //   params: { email },
    //   auth: { username: this.sources.clearbit.apiKey, password: '' }
    // });

    // Mock data
    return {
      id: 'clearbit_123',
      name: {
        fullName: 'John Smith',
        givenName: 'John',
        familyName: 'Smith'
      },
      email: email,
      location: 'San Francisco, CA, US',
      timeZone: 'America/Los_Angeles',
      utcOffset: -8,
      geo: {
        city: 'San Francisco',
        state: 'California',
        stateCode: 'CA',
        country: 'United States',
        countryCode: 'US',
        lat: 37.7749,
        lng: -122.4194
      },
      bio: 'Experienced sales professional with 10+ years in enterprise software',
      site: 'https://johnsmith.com',
      avatar: 'https://via.placeholder.com/200',
      employment: {
        domain: 'techcorp.com',
        name: 'Tech Corp',
        title: 'Sales Director',
        role: 'sales',
        seniority: 'director'
      },
      facebook: {
        handle: 'johnsmith'
      },
      github: {
        handle: 'jsmith',
        followers: 150
      },
      twitter: {
        handle: 'johnsmith',
        followers: 5000,
        following: 800
      },
      linkedin: {
        handle: 'in/johnsmith'
      },
      googleplus: {
        handle: null
      }
    };
  }

  /**
   * Enrich from Hunter.io (mock implementation)
   */
  async enrichFromHunter(email) {
    // In production, make real API call
    // const response = await axios.get(`${this.sources.hunter.baseUrl}/email-verifier`, {
    //   params: { email, api_key: this.sources.hunter.apiKey }
    // });

    // Mock data
    return {
      status: 'valid',
      result: 'deliverable',
      score: 92,
      email: email,
      regexp: true,
      gibberish: false,
      disposable: false,
      webmail: false,
      mx_records: true,
      smtp_server: true,
      smtp_check: true,
      accept_all: false,
      block: false,
      sources: [
        {
          domain: 'techcorp.com',
          uri: 'https://techcorp.com/team',
          extracted_on: '2024-01-15',
          still_on_page: true
        }
      ],
      phone: '+1-415-555-0123',
      alternateEmails: [
        'j.smith@techcorp.com',
        'johnsmith@gmail.com'
      ]
    };
  }

  /**
   * Enrich company data (mock implementation)
   */
  async enrichCompany(companyName) {
    // Mock data
    return {
      name: companyName,
      legalName: `${companyName} Inc.`,
      domain: `${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      category: {
        sector: 'Information Technology',
        industryGroup: 'Software & Services',
        industry: 'Software',
        subIndustry: 'Application Software'
      },
      tags: ['B2B', 'SaaS', 'Enterprise'],
      description: `${companyName} provides innovative software solutions`,
      foundedYear: 2015,
      location: 'San Francisco, CA',
      timeZone: 'America/Los_Angeles',
      utcOffset: -8,
      geo: {
        streetNumber: '123',
        streetName: 'Market Street',
        city: 'San Francisco',
        postalCode: '94105',
        state: 'California',
        stateCode: 'CA',
        country: 'United States',
        countryCode: 'US'
      },
      logo: 'https://via.placeholder.com/200',
      facebook: {
        handle: companyName.toLowerCase()
      },
      linkedin: {
        handle: `company/${companyName.toLowerCase()}`
      },
      twitter: {
        handle: companyName.toLowerCase(),
        followers: 10000
      },
      crunchbase: {
        handle: companyName.toLowerCase()
      },
      metrics: {
        alexaUsRank: 5000,
        alexaGlobalRank: 50000,
        employees: 250,
        employeesRange: '201-500',
        marketCap: null,
        raised: 50000000,
        annualRevenue: 25000000,
        estimatedAnnualRevenue: '$25M-$50M',
        fiscalYearEnd: 12
      },
      tech: [
        'Google Analytics',
        'Salesforce',
        'AWS',
        'React',
        'Node.js'
      ],
      techCategories: [
        'Analytics',
        'CRM',
        'Cloud Hosting',
        'JavaScript Frameworks'
      ],
      phone: '+1-415-555-0100',
      emailProvider: false,
      type: 'private',
      ticker: null,
      identifiers: {
        usEIN: null
      },
      parent: {
        domain: null
      }
    };
  }

  /**
   * Merge Clearbit data into enriched data
   */
  mergeClearbitData(enrichedData, clearbitData) {
    // Personal info
    if (clearbitData.name) {
      enrichedData.personal.fullName = clearbitData.name.fullName;
      enrichedData.personal.firstName = clearbitData.name.givenName;
      enrichedData.personal.lastName = clearbitData.name.familyName;
    }

    enrichedData.personal.bio = clearbitData.bio;
    enrichedData.personal.avatar = clearbitData.avatar;
    enrichedData.personal.website = clearbitData.site;
    enrichedData.personal.location = clearbitData.location;
    enrichedData.personal.timezone = clearbitData.timeZone;

    // Professional info
    if (clearbitData.employment) {
      enrichedData.professional.company = clearbitData.employment.name;
      enrichedData.professional.companyDomain = clearbitData.employment.domain;
      enrichedData.professional.title = clearbitData.employment.title;
      enrichedData.professional.role = clearbitData.employment.role;
      enrichedData.professional.seniority = clearbitData.employment.seniority;
    }

    // Social profiles
    if (clearbitData.linkedin) enrichedData.social.linkedin = clearbitData.linkedin.handle;
    if (clearbitData.twitter) enrichedData.social.twitter = clearbitData.twitter.handle;
    if (clearbitData.facebook) enrichedData.social.facebook = clearbitData.facebook.handle;
    if (clearbitData.github) enrichedData.social.github = clearbitData.github.handle;

    // Demographics
    if (clearbitData.geo) {
      enrichedData.demographics.city = clearbitData.geo.city;
      enrichedData.demographics.state = clearbitData.geo.state;
      enrichedData.demographics.country = clearbitData.geo.country;
      enrichedData.demographics.coordinates = {
        lat: clearbitData.geo.lat,
        lng: clearbitData.geo.lng
      };
    }
  }

  /**
   * Merge Hunter data into enriched data
   */
  mergeHunterData(enrichedData, hunterData) {
    enrichedData.contact.emailVerified = hunterData.status === 'valid';
    enrichedData.contact.emailScore = hunterData.score;
    enrichedData.contact.emailDeliverable = hunterData.result === 'deliverable';
    enrichedData.contact.phone = hunterData.phone;
    enrichedData.contact.alternateEmails = hunterData.alternateEmails || [];
  }

  /**
   * Merge company data into enriched data
   */
  mergeCompanyData(enrichedData, companyData) {
    enrichedData.company = {
      ...enrichedData.company,
      name: companyData.name,
      legalName: companyData.legalName,
      domain: companyData.domain,
      description: companyData.description,
      industry: companyData.category?.industry,
      sector: companyData.category?.sector,
      foundedYear: companyData.foundedYear,
      location: companyData.location,
      logo: companyData.logo,
      employees: companyData.metrics?.employees,
      employeesRange: companyData.metrics?.employeesRange,
      revenue: companyData.metrics?.estimatedAnnualRevenue,
      annualRevenue: companyData.metrics?.annualRevenue,
      raised: companyData.metrics?.raised,
      phone: companyData.phone,
      social: {
        linkedin: companyData.linkedin?.handle,
        twitter: companyData.twitter?.handle,
        facebook: companyData.facebook?.handle
      }
    };

    enrichedData.technographics = companyData.tech || [];
  }

  /**
   * Apply enriched data to lead record
   */
  async applyEnrichedDataToLead(lead, enrichedData) {
    // Update personal info
    if (enrichedData.personal.firstName && !lead.firstName) {
      lead.firstName = enrichedData.personal.firstName;
    }
    if (enrichedData.personal.lastName && !lead.lastName) {
      lead.lastName = enrichedData.personal.lastName;
    }

    // Update professional info
    if (enrichedData.professional.company && !lead.company) {
      lead.company = enrichedData.professional.company;
    }
    if (enrichedData.professional.title && !lead.jobTitle) {
      lead.jobTitle = enrichedData.professional.title;
    }

    // Update contact info
    if (enrichedData.contact.phone && !lead.phone) {
      lead.phone = enrichedData.contact.phone;
    }

    // Update location
    if (enrichedData.personal.location && !lead.location) {
      lead.location = enrichedData.personal.location;
    }

    // Update social profiles
    if (enrichedData.social.linkedin) {
      lead.linkedinUrl = `https://linkedin.com/${enrichedData.social.linkedin}`;
    }
    if (enrichedData.social.twitter) {
      lead.twitterHandle = enrichedData.social.twitter;
    }

    // Store enriched data in custom fields
    lead.enrichmentData = enrichedData;
    lead.lastEnriched = new Date();

    // Update or create company record
    if (enrichedData.company.name) {
      await this.updateOrCreateCompany(enrichedData.company, lead);
    }
  }

  /**
   * Update or create company from enriched data
   */
  async updateOrCreateCompany(companyData, lead) {
    try {
      let company = await Company.findOne({
        $or: [
          { name: companyData.name },
          { domain: companyData.domain }
        ]
      });

      if (!company) {
        company = new Company({
          name: companyData.name,
          domain: companyData.domain,
          industry: companyData.industry,
          description: companyData.description,
          website: companyData.domain ? `https://${companyData.domain}` : null,
          employeeCount: companyData.employeesRange,
          annualRevenue: companyData.annualRevenue,
          phone: companyData.phone,
          address: {
            city: companyData.location
          }
        });

        await company.save();
        logger.info(`Created company: ${company.name}`);
      }

      // Link lead to company
      if (!company.contacts) company.contacts = [];
      if (!company.contacts.includes(lead._id)) {
        company.contacts.push(lead._id);
        await company.save();
      }
    } catch (error) {
      logger.error('Update/create company error:', error);
    }
  }

  /**
   * Get sources used for enrichment
   */
  getSourcesUsed(enrichedData) {
    const sources = [];

    if (enrichedData.personal.fullName) sources.push('Clearbit');
    if (enrichedData.contact.emailScore) sources.push('Hunter.io');
    if (enrichedData.company.employees) sources.push('Company Database');

    return sources;
  }

  /**
   * Bulk enrich leads
   */
  async bulkEnrichLeads(leadIds) {
    try {
      const results = {
        total: leadIds.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const leadId of leadIds) {
        try {
          await this.enrichLead(leadId);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            leadId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Bulk enrichment error:', error);
      throw error;
    }
  }

  /**
   * Find email for a lead
   */
  async findEmail(firstName, lastName, companyDomain) {
    try {
      logger.info(`Finding email for ${firstName} ${lastName} at ${companyDomain}`);

      // Common email patterns
      const patterns = [
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyDomain}`,
        `${firstName.toLowerCase()}${lastName.toLowerCase()}@${companyDomain}`,
        `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}@${companyDomain}`,
        `${firstName.toLowerCase()}@${companyDomain}`
      ];

      // In production, verify each email
      // For now, return the most common pattern
      return {
        email: patterns[0],
        confidence: 'medium',
        pattern: 'first.last',
        allPatterns: patterns
      };
    } catch (error) {
      logger.error('Find email error:', error);
      throw error;
    }
  }

  /**
   * Verify email deliverability
   */
  async verifyEmail(email) {
    try {
      logger.info(`Verifying email: ${email}`);

      // Mock implementation
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      return {
        email,
        valid: isValid,
        deliverable: isValid,
        score: isValid ? 90 : 0,
        disposable: false,
        acceptAll: false,
        mxRecords: isValid,
        smtpCheck: isValid
      };
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Get enrichment credits/usage
   */
  async getEnrichmentUsage(userId) {
    try {
      const leads = await Lead.find({
        owner: userId,
        lastEnriched: { $exists: true }
      });

      return {
        enrichedLeads: leads.length,
        thisMonth: leads.filter(l => {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return l.lastEnriched >= monthAgo;
        }).length,
        creditsUsed: leads.length,
        creditsRemaining: 1000 - leads.length // Mock limit
      };
    } catch (error) {
      logger.error('Get enrichment usage error:', error);
      throw error;
    }
  }
}

module.exports = new LeadEnrichmentService();
