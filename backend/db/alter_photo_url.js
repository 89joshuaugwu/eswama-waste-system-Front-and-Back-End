const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const isRemoteOrSsl = Boolean(
  connectionString && (
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production'
  )
);

const pool = new Pool({
  connectionString,
  ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    console.log('Altering photo_url column to TEXT...');
    await pool.query("ALTER TABLE waste_reports ALTER COLUMN photo_url TYPE TEXT;");
    console.log('Successfully updated the waste_reports table.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

run();
