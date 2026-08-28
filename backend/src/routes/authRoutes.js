const express = require('express');
const router = express.Router();
const { register, login, me, createUser } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/users', requireAuth, createUser);

module.exports = router;
