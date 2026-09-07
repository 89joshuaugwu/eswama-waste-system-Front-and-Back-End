const pool = require('../config/db');

async function sendPickupReminders(io, userId = null) {
  const { rows } = await pool.query(`
    INSERT INTO notifications (user_id, message, pickup_date)
    SELECT u.user_id,
      'Today is pickup day. Please bag your waste and have it ready for collection by '
      || to_char(s.pickup_time, 'HH24:MI') || ' (Nigeria time).'
      || CASE WHEN s.notes <> '' THEN ' ' || s.notes ELSE '' END,
      (NOW() AT TIME ZONE 'Africa/Lagos')::date
    FROM users u CROSS JOIN pickup_schedules s
    WHERE u.role = 'resident' AND u.status = 'Active'
      AND ($1::integer IS NULL OR u.user_id = $1)
      AND s.weekday = EXTRACT(DOW FROM NOW() AT TIME ZONE 'Africa/Lagos')
    ON CONFLICT (user_id, pickup_date) WHERE pickup_date IS NOT NULL DO NOTHING
    RETURNING user_id`, [userId]);
  for (const row of rows) io?.to(`user:${row.user_id}`).emit('notification:new');
}

function startPickupReminders(io) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await sendPickupReminders(io); }
    catch (err) { console.error('Pickup reminder check failed:', err.message); }
    finally { running = false; }
  };
  run();
  const timer = setInterval(run, 60000);
  timer.unref();
  return timer;
}

module.exports = { sendPickupReminders, startPickupReminders };
