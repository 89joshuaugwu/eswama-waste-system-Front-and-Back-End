const pool = require('../config/db');

async function createReport(req, res) {
  try {
    const { description, photoUrl, latitude, longitude } = req.body;

    if (!description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'description, latitude and longitude are required.' });
    }

    const result = await pool.query(
      `INSERT INTO waste_reports (user_id, description, photo_url, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.userId, description, photoUrl || null, latitude, longitude]
    );

    const report = result.rows[0];

    // Notify all admins of the new report
    const admins = await pool.query("SELECT user_id FROM users WHERE role = 'admin'");
    const notifyValues = admins.rows.map((a) => [a.user_id, `New waste report submitted: "${description.slice(0, 60)}"`]);
    if (notifyValues.length > 0) {
      const placeholders = notifyValues.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
      const flatValues = notifyValues.flat();
      await pool.query(
        `INSERT INTO notifications (user_id, message) VALUES ${placeholders}`,
        flatValues
      );
    }

    const io = req.app.get('io');
    if (io) io.to('role:admin').emit('report:new', report);

    return res.status(201).json({ report });
  } catch (err) {
    console.error('createReport error:', err);
    return res.status(500).json({ error: 'Could not submit report.' });
  }
}

async function listReports(req, res) {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query(
        `SELECT r.*, u.full_name AS reporter_name
         FROM waste_reports r JOIN users u ON u.user_id = r.user_id
         ORDER BY r.reported_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT * FROM waste_reports WHERE user_id = $1 ORDER BY reported_at DESC`,
        [req.user.userId]
      );
    }
    return res.json({ reports: result.rows });
  } catch (err) {
    console.error('listReports error:', err);
    return res.status(500).json({ error: 'Could not fetch reports.' });
  }
}

async function getReport(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM waste_reports WHERE report_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    const report = result.rows[0];
    if (req.user.role !== 'admin' && report.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'You cannot view this report.' });
    }
    return res.json({ report });
  } catch (err) {
    console.error('getReport error:', err);
    return res.status(500).json({ error: 'Could not fetch report.' });
  }
}

async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Assigned', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE waste_reports SET status = $1 WHERE report_id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const report = result.rows[0];

    if (status === 'Resolved') {
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [report.user_id, 'Your waste report has been resolved. Thank you for reporting it.']
      );
      const io = req.app.get('io');
      if (io) io.to(`user:${report.user_id}`).emit('report:resolved', report);
    }

    return res.json({ report });
  } catch (err) {
    console.error('updateReportStatus error:', err);
    return res.status(500).json({ error: 'Could not update report status.' });
  }
}

module.exports = { createReport, listReports, getReport, updateReportStatus };
