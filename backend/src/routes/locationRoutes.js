const express = require('express');
const router = express.Router();
const { postLocation, getLatestLocations } = require('../controllers/locationController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', requireRole('driver'), postLocation);
router.get('/latest', requireRole('admin'), getLatestLocations);

module.exports = router;
