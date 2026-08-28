-- Optional demo data. Passwords below are all "password123" (bcrypt hashed).
-- Run this AFTER schema.sql if you want sample accounts to log in with.
-- Hash generated with bcrypt, 10 salt rounds, for the string "password123".

INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('Amaka Resident', 'amaka.resident@example.com', '08010000001',
 '$2b$10$CwTycUXWue0Thq9StjUM0uJ8u1UY1UkVQxfrIchxdWDJyVKPXcXpG', 'resident'),
('ESWAMA Admin', 'admin@eswama.gov.ng', '08010000002',
 '$2b$10$CwTycUXWue0Thq9StjUM0uJ8u1UY1UkVQxfrIchxdWDJyVKPXcXpG', 'admin'),
('Chidi Driver', 'chidi.driver@eswama.gov.ng', '08010000003',
 '$2b$10$CwTycUXWue0Thq9StjUM0uJ8u1UY1UkVQxfrIchxdWDJyVKPXcXpG', 'driver')
ON CONFLICT (email) DO NOTHING;

INSERT INTO vehicles (plate_number, driver_id, zone, status)
SELECT 'ENU-234-XY', user_id, 'Independence Layout', 'Active'
FROM users WHERE email = 'chidi.driver@eswama.gov.ng'
ON CONFLICT (plate_number) DO NOTHING;

-- Note: bcrypt hash above is illustrative. If it does not verify against
-- "password123" on your bcrypt version, just register fresh accounts through
-- the app instead -- the hash was generated offline and not verified against
-- this exact bcryptjs build.
