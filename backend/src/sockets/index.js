const { verifyToken } = require('../utils/jwt');

// Rooms used:
//   user:<userId>  - private notifications/events for one user
//   role:admin     - broadcast channel admins listen on (new reports, locations)
function initSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token missing.'));
    }
    try {
      const payload = verifyToken(token);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.user;
    socket.join(`user:${userId}`);
    if (role === 'admin') {
      socket.join('role:admin');
    }

    console.log(`Socket connected: user ${userId} (${role})`);

    // Drivers can also push their location over the socket for lower latency
    // than a plain HTTP POST, in addition to the REST endpoint.
    socket.on('location:push', (payload) => {
      if (role !== 'driver') return;
      io.to('role:admin').emit('location:update', {
        driverId: userId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        recordedAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${userId}`);
    });
  });
}

module.exports = initSockets;
