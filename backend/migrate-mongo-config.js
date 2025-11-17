/**
 * migrate-mongo Configuration
 * Database migration management for MongoDB
 *
 * Usage:
 *   npm run migrate:create <migration-name>  - Create new migration
 *   npm run migrate:up                       - Run pending migrations
 *   npm run migrate:down                     - Rollback last migration
 *   npm run migrate:status                   - Check migration status
 */

require('dotenv').config();

const config = {
  mongodb: {
    // Connection URL
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',

    // Database name
    databaseName: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.split('/').pop().split('?')[0]
      : 'velocityhub',

    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // The migrations dir, can be an relative or absolute path
  migrationsDir: 'migrations',

  // The mongodb collection where the applied changes are stored
  changelogCollectionName: 'changelog',

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: '.js',

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run. Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'commonjs',
};

module.exports = config;
