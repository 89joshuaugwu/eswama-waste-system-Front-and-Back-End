const express = require('express');
const router = express.Router();
const {
  createReport,
  listReports,
  getReport,
  updateReportStatus,
} = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', requireRole('resident'), createReport);
router.get('/', listReports); // admin sees all, resident sees own
router.get('/:id', getReport);
router.patch('/:id/status', requireRole('admin'), updateReportStatus);

module.exports = router;
