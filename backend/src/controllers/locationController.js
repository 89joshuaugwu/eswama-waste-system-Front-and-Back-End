const pool = require('../config/db');

async function postLocation(req, res) {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required.' });
    }

    const vehicleResult = await pool.query(
      'SELECT vehicle_id FROM vehicles WHERE driver_id = $1',
      [req.user.userId]
    );
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: 'No vehicle is assigned to this driver.' });
    }
    const vehicleId = vehicleResult.rows[0].vehicle_id;

    const result = await pool.query(
      `INSERT INTO vehicle_locations (vehicle_id, latitude, longitude)
       VALUES ($1, $2, $3) RETURNING *`,
      [vehicleId, latitude, longitude]
    );
    const location = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.to('role:admin').emit('location:update', {
        vehicleId,
        driverId: req.user.userId,
        latitude,
        longitude,
        recordedAt: location.recorded_at,
      });
    }

    return res.status(201).json({ location });
  } catch (err) {
    console.error('postLocation error:', err);
    return res.status(500).json({ error: 'Could not record location.' });
  }
}

// Latest known position for every active vehicle (admin live map).
async function getLatestLocations(req, res) {
  try {
    const result = await pool.query(`
      SELECT v.vehicle_id, v.plate_number, v.zone, u.full_name AS driver_name,
             vl.latitude, vl.longitude, vl.recorded_at
      FROM vehicles v
      JOIN users u ON u.user_id = v.driver_id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, recorded_at
        FROM vehicle_locations
        WHERE vehicle_id = v.vehicle_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) vl ON true
      WHERE v.status = 'Active'
    `);
    return res.json({ vehicles: result.rows });
  } catch (err) {
    console.error('getLatestLocations error:', err);
    return res.status(500).json({ error: 'Could not fetch vehicle locations.' });
  }
}

module.exports = { postLocation, getLatestLocations };
