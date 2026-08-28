const express = require('express');
const router = express.Router();
const {
  suggestNearestDriver,
  createTask,
  listTasks,
  updateTaskStatus,
} = require('../controllers/taskController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/nearest-driver', requireRole('admin'), suggestNearestDriver);
router.post('/', requireRole('admin'), createTask);
router.get('/', requireRole('admin', 'driver'), listTasks);
router.patch('/:id/status', requireRole('admin', 'driver'), updateTaskStatus);

module.exports = router;
