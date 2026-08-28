const pool = require('../config/db');

async function getAnalytics(req, res) {
  try {
    // 1. Total reports by status
    const statusCountsResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM waste_reports 
      GROUP BY status
    `);
    
    const reportsByStatus = {
      Pending: 0,
      Assigned: 0,
      Resolved: 0
    };
    
    statusCountsResult.rows.forEach(row => {
      reportsByStatus[row.status] = parseInt(row.count, 10);
    });

    // 2. Average Resolution Time (in hours)
    // For reports that are Resolved and have a completed task
    const resolutionTimeResult = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (t.completed_at - r.reported_at))/3600) as avg_hours
      FROM waste_reports r
      JOIN collection_tasks t ON r.report_id = t.report_id
      WHERE r.status = 'Resolved' AND t.status = 'Completed' AND t.completed_at IS NOT NULL
    `);
    
    const averageResolutionHours = resolutionTimeResult.rows[0].avg_hours 
      ? parseFloat(resolutionTimeResult.rows[0].avg_hours).toFixed(2) 
      : 0;

    // 3. Driver Performance (tasks completed per driver)
    const driverPerformanceResult = await pool.query(`
      SELECT u.full_name as driver_name, COUNT(t.task_id) as completed_tasks
      FROM collection_tasks t
      JOIN users u ON t.driver_id = u.user_id
      WHERE t.status = 'Completed'
      GROUP BY u.full_name
      ORDER BY completed_tasks DESC
      LIMIT 10
    `);

    // 4. Reports over time (last 7 days)
    const reportsOverTimeResult = await pool.query(`
      SELECT DATE(reported_at) as date, COUNT(*) as count
      FROM waste_reports
      WHERE reported_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(reported_at)
      ORDER BY date ASC
    `);

    return res.json({
      reportsByStatus,
      averageResolutionHours,
      driverPerformance: driverPerformanceResult.rows.map(r => ({
        driver_name: r.driver_name,
        completed_tasks: parseInt(r.completed_tasks, 10)
      })),
      reportsOverTime: reportsOverTimeResult.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count, 10)
      }))
    });

  } catch (err) {
    console.error('getAnalytics error:', err);
    return res.status(500).json({ error: 'Could not fetch analytics data.' });
  }
}

module.exports = { getAnalytics };
