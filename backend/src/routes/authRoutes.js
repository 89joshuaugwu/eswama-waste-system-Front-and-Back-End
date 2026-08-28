const express = require('express');
const router = express.Router();
const { register, login, me, createUser, listUsers, updateUserStatus, deleteUser } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/users', requireAuth, createUser);
router.get('/users', requireAuth, listUsers);
router.patch('/users/:id/status', requireAuth, updateUserStatus);
router.delete('/users/:id', requireAuth, deleteUser);

module.exports = router;
