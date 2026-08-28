const express = require('express');
const { getAnalytics } = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), getAnalytics);

module.exports = router;
