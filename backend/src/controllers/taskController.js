const pool = require('../config/db');
const { findNearestDriver } = require('../utils/geo');

// Returns each active driver's most recent known location, for drivers who
// do not currently have an unfinished task.
async function getAvailableDriversWithLocation() {
  const result = await pool.query(`
    SELECT u.user_id AS driver_id, u.full_name, vl.latitude, vl.longitude
    FROM users u
    JOIN vehicles v ON v.driver_id = u.user_id AND v.status = 'Active'
    JOIN LATERAL (
      SELECT latitude, longitude
      FROM vehicle_locations
      WHERE vehicle_id = v.vehicle_id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) vl ON true
    WHERE u.role = 'driver'
      AND u.user_id NOT IN (
        SELECT driver_id FROM collection_tasks WHERE status IN ('Assigned', 'In Progress')
      )
  `);
  return result.rows;
}

async function suggestNearestDriver(req, res) {
  try {
    const { reportId } = req.query;
    if (!reportId) {
      return res.status(400).json({ error: 'reportId query parameter is required.' });
    }

    const reportResult = await pool.query(
      'SELECT * FROM waste_reports WHERE report_id = $1',
      [reportId]
    );
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    const report = reportResult.rows[0];

    const availableDrivers = await getAvailableDriversWithLocation();
    if (availableDrivers.length === 0) {
      return res.status(404).json({ error: 'No available drivers with a known location right now.' });
    }

    const nearest = findNearestDriver(
      parseFloat(report.latitude),
      parseFloat(report.longitude),
      availableDrivers.map((d) => ({ ...d, latitude: parseFloat(d.latitude), longitude: parseFloat(d.longitude) }))
    );

    return res.json({ suggestedDriver: nearest });
  } catch (err) {
    console.error('suggestNearestDriver error:', err);
    return res.status(500).json({ error: 'Could not compute nearest driver.' });
  }
}

async function createTask(req, res) {
  try {
    const { reportId, driverId } = req.body;
    if (!reportId || !driverId) {
      return res.status(400).json({ error: 'reportId and driverId are required.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const taskResult = await client.query(
        `INSERT INTO collection_tasks (report_id, driver_id, assigned_by, status)
         VALUES ($1, $2, $3, 'Assigned')
         RETURNING *`,
        [reportId, driverId, req.user.userId]
      );

      await client.query(
        `UPDATE waste_reports SET status = 'Assigned' WHERE report_id = $1`,
        [reportId]
      );

      await client.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
        [driverId, 'You have been assigned a new waste collection task.']
      );

      await client.query('COMMIT');

      const task = taskResult.rows[0];
      const io = req.app.get('io');
      if (io) io.to(`user:${driverId}`).emit('task:assigned', task);

      return res.status(201).json({ task });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('createTask error:', err);
    return res.status(500).json({ error: 'Could not create task.' });
  }
}

async function listTasks(req, res) {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query(`
        SELECT t.*, r.description, r.latitude, r.longitude, u.full_name AS driver_name
        FROM collection_tasks t
        JOIN waste_reports r ON r.report_id = t.report_id
        JOIN users u ON u.user_id = t.driver_id
        ORDER BY t.assigned_at DESC
      `);
    } else if (req.user.role === 'driver') {
      result = await pool.query(
        `SELECT t.*, r.description, r.latitude, r.longitude
         FROM collection_tasks t
         JOIN waste_reports r ON r.report_id = t.report_id
         WHERE t.driver_id = $1
         ORDER BY t.assigned_at DESC`,
        [req.user.userId]
      );
    } else {
      return res.status(403).json({ error: 'Residents cannot list tasks directly.' });
    }
    return res.json({ tasks: result.rows });
  } catch (err) {
    console.error('listTasks error:', err);
    return res.status(500).json({ error: 'Could not fetch tasks.' });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Assigned', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const taskResult = await pool.query('SELECT * FROM collection_tasks WHERE task_id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    const existingTask = taskResult.rows[0];
    if (req.user.role === 'driver' && existingTask.driver_id !== req.user.userId) {
      return res.status(403).json({ error: 'You cannot update a task assigned to someone else.' });
    }

    const completedAt = status === 'Completed' ? new Date() : existingTask.completed_at;
    const updateResult = await pool.query(
      'UPDATE collection_tasks SET status = $1, completed_at = $2 WHERE task_id = $3 RETURNING *',
      [status, completedAt, id]
    );
    const task = updateResult.rows[0];

    if (status === 'Completed') {
      await pool.query(
        `UPDATE waste_reports SET status = 'Resolved' WHERE report_id = $1`,
        [task.report_id]
      );
      const reportResult = await pool.query(
        'SELECT user_id FROM waste_reports WHERE report_id = $1',
        [task.report_id]
      );
      const residentId = reportResult.rows[0]?.user_id;
      if (residentId) {
        await pool.query(
          'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
          [residentId, 'Your waste report has been resolved. Thank you for reporting it.']
        );
        const io = req.app.get('io');
        if (io) io.to(`user:${residentId}`).emit('report:resolved', { reportId: task.report_id });
      }
    }

    return res.json({ task });
  } catch (err) {
    console.error('updateTaskStatus error:', err);
    return res.status(500).json({ error: 'Could not update task.' });
  }
}

module.exports = { suggestNearestDriver, createTask, listTasks, updateTaskStatus };
