const router = require('express').Router();
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendPickupReminders } = require('../services/pickupReminders');

router.use(requireAuth);
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT schedule_id, weekday,
      to_char(pickup_time, 'HH24:MI') AS pickup_time, notes,
      (weekday - EXTRACT(DOW FROM NOW() AT TIME ZONE 'Africa/Lagos')::int + 7) % 7 AS days_away
      FROM pickup_schedules ORDER BY days_away, pickup_time`);
    res.json({ schedules: rows });
  } catch (err) { res.status(500).json({ error: 'Could not load pickup schedule.' }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { weekday, pickupTime, notes = '' } = req.body;
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
      typeof pickupTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime) ||
      typeof notes !== 'string' || notes.length > 500) {
    return res.status(400).json({ error: 'Choose a valid day, time, and notes of up to 500 characters.' });
  }
  try {
    const { rows } = await pool.query(`INSERT INTO pickup_schedules (weekday, pickup_time, notes, created_by)
      VALUES ($1, $2, $3, $4) ON CONFLICT (weekday) DO UPDATE
      SET pickup_time = EXCLUDED.pickup_time, notes = EXCLUDED.notes
      RETURNING *`, [weekday, pickupTime, notes.trim(), req.user.userId]);
    req.app.get('io')?.emit('pickup:updated');
    // Saving remains successful if reminder delivery needs to retry on the next tick.
    sendPickupReminders(req.app.get('io')).catch(err => console.error('Pickup reminder:', err.message));
    res.json({ schedule: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Could not save pickup day.' }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) > 2147483647) {
    return res.status(400).json({ error: 'Invalid pickup day.' });
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM pickup_schedules WHERE schedule_id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Pickup day not found.' });
    req.app.get('io')?.emit('pickup:updated');
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: 'Could not remove pickup day.' }); }
});

module.exports = router;
