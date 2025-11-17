# Database Migration Guide

## Overview

This project uses `migrate-mongo` for database migrations. Migrations allow you to version control your database schema changes and apply them consistently across environments.

## Commands

### Create a New Migration

```bash
npm run migrate:create <migration-name>
```

Example:
```bash
npm run migrate:create add-lead-tags-field
```

This creates a new migration file in `migrations/` directory.

### Run Pending Migrations

```bash
npm run migrate:up
```

Applies all pending migrations in chronological order.

### Rollback Last Migration

```bash
npm run migrate:down
```

Reverts the most recently applied migration.

### Check Migration Status

```bash
npm run migrate:status
```

Shows which migrations have been applied and which are pending.

## Migration File Structure

Each migration file exports two functions:

```javascript
module.exports = {
  async up(db, client) {
    // Migration code (apply changes)
  },

  async down(db, client) {
    // Rollback code (revert changes)
  }
};
```

## Example Migrations

### Example 1: Add Field to Collection

```javascript
// migrations/20250117120000-add-lead-priority.js
module.exports = {
  async up(db, client) {
    await db.collection('leads').updateMany(
      { priority: { $exists: false } },
      { $set: { priority: 'medium' } }
    );
  },

  async down(db, client) {
    await db.collection('leads').updateMany(
      {},
      { $unset: { priority: '' } }
    );
  }
};
```

### Example 2: Create Index

```javascript
// migrations/20250117120001-add-email-index.js
module.exports = {
  async up(db, client) {
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, name: 'email_unique_idx' }
    );
  },

  async down(db, client) {
    await db.collection('users').dropIndex('email_unique_idx');
  }
};
```

### Example 3: Rename Field

```javascript
// migrations/20250117120002-rename-company-to-organization.js
module.exports = {
  async up(db, client) {
    await db.collection('leads').updateMany(
      {},
      { $rename: { company: 'organization' } }
    );
  },

  async down(db, client) {
    await db.collection('leads').updateMany(
      {},
      { $rename: { organization: 'company' } }
    );
  }
};
```

### Example 4: Data Transformation

```javascript
// migrations/20250117120003-normalize-phone-numbers.js
module.exports = {
  async up(db, client) {
    const leads = await db.collection('leads').find({ phone: { $exists: true } }).toArray();

    for (const lead of leads) {
      // Remove all non-numeric characters
      const normalizedPhone = lead.phone.replace(/\D/g, '');

      await db.collection('leads').updateOne(
        { _id: lead._id },
        { $set: { phone: normalizedPhone } }
      );
    }
  },

  async down(db, client) {
    // Rollback not possible for data transformations like this
    // You might want to backup before running
    console.log('Cannot rollback phone number normalization');
  }
};
```

### Example 5: Add New Collection

```javascript
// migrations/20250117120004-create-activities-collection.js
module.exports = {
  async up(db, client) {
    await db.createCollection('activities', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['type', 'entityType', 'entityId', 'userId', 'timestamp'],
          properties: {
            type: {
              bsonType: 'string',
              enum: ['email', 'call', 'meeting', 'note'],
            },
            entityType: {
              bsonType: 'string',
              enum: ['lead', 'deal', 'contact', 'company'],
            },
            entityId: {
              bsonType: 'objectId',
            },
            userId: {
              bsonType: 'objectId',
            },
            timestamp: {
              bsonType: 'date',
            },
          },
        },
      },
    });

    // Create indexes
    await db.collection('activities').createIndex({ entityType: 1, entityId: 1 });
    await db.collection('activities').createIndex({ userId: 1, timestamp: -1 });
  },

  async down(db, client) {
    await db.collection('activities').drop();
  }
};
```

## Best Practices

### 1. Always Test Migrations Locally First

```bash
# Test migration
npm run migrate:up

# Verify changes
npm run migrate:status

# If something went wrong
npm run migrate:down
```

### 2. Make Migrations Reversible

Always implement the `down()` function to allow rollbacks.

### 3. Use Transactions for Complex Migrations

```javascript
module.exports = {
  async up(db, client) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection('leads').updateMany(...);
        await db.collection('contacts').updateMany(...);
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    // Rollback logic
  }
};
```

### 4. Backup Before Major Migrations

```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/velocityhub" --out=./backups/$(date +%Y%m%d)

# Restore if needed
mongorestore --uri="mongodb://localhost:27017/velocityhub" ./backups/20250117/
```

### 5. Document Breaking Changes

Add comments to migration files explaining any breaking changes:

```javascript
/**
 * BREAKING CHANGE:
 * This migration renames the 'company' field to 'organization'
 * across all leads. Update your application code before running.
 */
module.exports = {
  // ...
};
```

## CI/CD Integration

### Development Environment

Migrations run automatically in development:

```bash
npm run dev  # Optionally run migrations first
```

### Production Deployment

Include migrations in your deployment process:

```bash
# In your deployment script
npm run migrate:up
npm start
```

### GitHub Actions Example

```yaml
- name: Run Database Migrations
  run: |
    cd backend
    npm run migrate:up
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
```

## Troubleshooting

### Migration Failed Mid-Way

1. Check the `changelog` collection to see what was applied
2. Manually fix any partial changes
3. Update the changelog if needed
4. Re-run the migration

### Migration Status Out of Sync

```bash
# View changelog
mongo velocityhub --eval "db.changelog.find().pretty()"

# Manually mark migration as applied (use with caution)
mongo velocityhub --eval 'db.changelog.insertOne({
  fileName: "20250117120000-my-migration.js",
  appliedAt: new Date()
})'
```

### Cannot Connect to MongoDB

Ensure your `.env` file has correct `MONGODB_URI`:

```bash
MONGODB_URI=mongodb://localhost:27017/velocityhub
```

## Common Use Cases

### Adding a New Feature

1. Update Mongoose models
2. Create migration to add new fields
3. Set default values for existing documents
4. Test thoroughly in development
5. Deploy to production

### Schema Refactoring

1. Create migration with both old and new fields
2. Deploy code that works with both
3. Migrate data from old to new fields
4. Deploy code that only uses new fields
5. Remove old fields in another migration

### Performance Optimization

1. Analyze slow queries
2. Create migration to add indexes
3. Test query performance
4. Deploy migration

## Additional Resources

- [migrate-mongo Documentation](https://github.com/seppevs/migrate-mongo)
- [MongoDB Schema Design Best Practices](https://www.mongodb.com/developer/products/mongodb/schema-design-anti-pattern-massive-arrays/)
- [MongoDB Index Strategies](https://www.mongodb.com/docs/manual/indexes/)
