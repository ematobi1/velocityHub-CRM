/**
 * Example Migration: Add Performance Indexes
 *
 * This migration adds commonly used indexes to improve query performance.
 * Remove this file or modify it based on your actual needs.
 */

module.exports = {
  async up(db, client) {
    console.log('Adding performance indexes...');

    // Users collection indexes
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, name: 'users_email_idx' }
    );

    // Leads collection indexes
    await db.collection('leads').createIndex(
      { email: 1 },
      { name: 'leads_email_idx' }
    );
    await db.collection('leads').createIndex(
      { owner: 1, status: 1 },
      { name: 'leads_owner_status_idx' }
    );
    await db.collection('leads').createIndex(
      { createdAt: -1 },
      { name: 'leads_created_idx' }
    );
    await db.collection('leads').createIndex(
      { score: -1 },
      { name: 'leads_score_idx' }
    );

    // Deals collection indexes
    await db.collection('deals').createIndex(
      { owner: 1, stage: 1 },
      { name: 'deals_owner_stage_idx' }
    );
    await db.collection('deals').createIndex(
      { expectedCloseDate: 1 },
      { name: 'deals_close_date_idx' }
    );
    await db.collection('deals').createIndex(
      { value: -1 },
      { name: 'deals_value_idx' }
    );

    // Contacts collection indexes
    await db.collection('contacts').createIndex(
      { email: 1 },
      { name: 'contacts_email_idx' }
    );
    await db.collection('contacts').createIndex(
      { company: 1 },
      { name: 'contacts_company_idx' }
    );

    // Companies collection indexes
    await db.collection('companies').createIndex(
      { name: 1 },
      { name: 'companies_name_idx' }
    );
    await db.collection('companies').createIndex(
      { owner: 1 },
      { name: 'companies_owner_idx' }
    );

    console.log('Indexes created successfully');
  },

  async down(db, client) {
    console.log('Removing performance indexes...');

    // Drop indexes (except _id which is automatic)
    await db.collection('users').dropIndex('users_email_idx');
    await db.collection('leads').dropIndex('leads_email_idx');
    await db.collection('leads').dropIndex('leads_owner_status_idx');
    await db.collection('leads').dropIndex('leads_created_idx');
    await db.collection('leads').dropIndex('leads_score_idx');
    await db.collection('deals').dropIndex('deals_owner_stage_idx');
    await db.collection('deals').dropIndex('deals_close_date_idx');
    await db.collection('deals').dropIndex('deals_value_idx');
    await db.collection('contacts').dropIndex('contacts_email_idx');
    await db.collection('contacts').dropIndex('contacts_company_idx');
    await db.collection('companies').dropIndex('companies_name_idx');
    await db.collection('companies').dropIndex('companies_owner_idx');

    console.log('Indexes removed successfully');
  },
};
