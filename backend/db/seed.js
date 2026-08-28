const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL is not defined in .env.');
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

async function runSeed() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('Seeding demo accounts into Neon database...');

    // 1. Insert Resident
    const resident = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ('Amaka Resident', 'resident@eswama.gov.ng', '08010000001', $1, 'resident')
       ON CONFLICT (email) DO UPDATE SET password_hash = $1
       RETURNING user_id`,
      [passwordHash]
    );

    // 2. Insert Admin
    const admin = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ('ESWAMA Admin', 'admin@eswama.gov.ng', '08010000002', $1, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = $1
       RETURNING user_id`,
      [passwordHash]
    );

    // 3. Insert Driver
    const driver = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ('Chidi Driver', 'driver@eswama.gov.ng', '08010000003', $1, 'driver')
       ON CONFLICT (email) DO UPDATE SET password_hash = $1
       RETURNING user_id`,
      [passwordHash]
    );

    const driverId = driver.rows[0]?.user_id;
    if (driverId) {
      await pool.query(
        `INSERT INTO vehicles (plate_number, driver_id, zone, status)
         VALUES ('ENU-234-XY', $1, 'Independence Layout', 'Active')
         ON CONFLICT (plate_number) DO UPDATE SET driver_id = $1, status = 'Active'`,
        [driverId]
      );
    }

    console.log('✅ Demo accounts seeded successfully!');
    console.log('--------------------------------------------------');
    console.log('Credentials for all accounts (Password: password123):');
    console.log('1. Admin:    admin@eswama.gov.ng');
    console.log('2. Resident: resident@eswama.gov.ng');
    console.log('3. Driver:   driver@eswama.gov.ng');
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();
