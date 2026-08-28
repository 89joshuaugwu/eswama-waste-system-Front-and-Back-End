const pool = require('../config/db');

async function listNotifications(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    return res.json({ notifications: result.rows });
  } catch (err) {
    console.error('listNotifications error:', err);
    return res.status(500).json({ error: 'Could not fetch notifications.' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE notification_id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    return res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ error: 'Could not update notification.' });
  }
}

module.exports = { listNotifications, markAsRead };
