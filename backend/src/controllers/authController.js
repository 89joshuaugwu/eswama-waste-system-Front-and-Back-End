const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;
const VALID_ROLES = ['resident', 'admin', 'driver'];

async function register(req, res) {
  try {
    const { fullName, email, phone, password, role } = req.body;

    if (!fullName || !email || !phone || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (role !== 'resident') {
      return res.status(403).json({ error: 'Public registration is only allowed for residents.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone, role, created_at`,
      [fullName, email, phone, passwordHash, role]
    );

    const user = result.rows[0];

    // Automatically provision a default vehicle for drivers so real-time tracking works immediately
    if (role === 'driver') {
      const plateNumber = `ENU-${Math.floor(100 + Math.random() * 900)}-WM`;
      await pool.query(
        `INSERT INTO vehicles (plate_number, driver_id, zone, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (plate_number) DO NOTHING`,
        [plateNumber, user.user_id, 'Enugu Central', 'Active']
      );
    }

    const token = signToken({ userId: user.user_id, role: user.role, fullName: user.full_name });

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Could not complete registration.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({ userId: user.user_id, role: user.role, fullName: user.full_name });

    return res.json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Could not complete login.' });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      'SELECT user_id, full_name, email, phone, role, created_at FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Could not fetch user profile.' });
  }
}

async function createUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create users.' });
    }
    
    const { fullName, email, phone, password, role } = req.body;

    if (!fullName || !email || !phone || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone, role, created_at`,
      [fullName, email, phone, passwordHash, role]
    );

    const user = result.rows[0];

    // Automatically provision a default vehicle for drivers
    if (role === 'driver') {
      const plateNumber = `ENU-${Math.floor(100 + Math.random() * 900)}-WM`;
      await pool.query(
        `INSERT INTO vehicles (plate_number, driver_id, zone, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (plate_number) DO NOTHING`,
        [plateNumber, user.user_id, 'Enugu Central', 'Active']
      );
    }

    return res.status(201).json({ user });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: 'Could not create user.' });
  }
}

module.exports = { register, login, me, createUser };
