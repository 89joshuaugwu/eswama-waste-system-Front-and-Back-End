const express = require('express');
const router = express.Router();
const { listNotifications, markAsRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
