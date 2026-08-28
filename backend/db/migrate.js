const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL or DATABASE_URL_UNPOOLED is not defined in .env.');
  process.exit(1);
}

const isRemoteOrSsl = Boolean(
  connectionString.includes('neon.tech') ||
  connectionString.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production'
);

const pool = new Pool({
  connectionString,
  ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : undefined,
});

async function runMigration() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Connecting to Neon PostgreSQL and applying schema.sql...');
    await pool.query(schemaSql);
    console.log('✅ Database schema applied successfully! All tables and indexes are ready.');
  } catch (err) {
    console.error('❌ Database migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
