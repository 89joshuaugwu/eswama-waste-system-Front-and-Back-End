const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('pickup schedules, authorization, and persistent daily reminders', async (t) => {
  const db = new PGlite();
  // Replace only the database boundary; exercise actual SQL, routes and JWT middleware.
  const dbModule = require.resolve('../src/config/db');
  const previous = require.cache[dbModule];
  require.cache[dbModule] = { id: dbModule, filename: dbModule, loaded: true,
    exports: { query: async (...args) => {
      const result = await db.query(...args);
      return { ...result, rowCount: result.affectedRows };
    } } };
  const express = require('express');
  const { signToken } = require('../src/utils/jwt');
  const { sendPickupReminders } = require('../src/services/pickupReminders');
  const events = [];
  const io = { emit: event => events.push(event), to: room => ({ emit: event => events.push([room, event]) }) };
  const app = express();
  app.use(express.json()); app.set('io', io);
  app.use('/pickups', require('../src/routes/pickupRoutes'));
  app.use('/notifications', require('../src/routes/notificationRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await db.close();
    if (previous) require.cache[dbModule] = previous;
    else delete require.cache[dbModule];
  });
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  await db.exec(schema);
  await db.exec(schema); // Migration must also work for an existing installation.
  await db.exec(`INSERT INTO users (full_name,email,phone,password_hash,role,status) VALUES
    ('Admin','admin@test','1','unused','admin','Active'),
    ('Resident','resident@test','2','unused','resident','Active'),
    ('Driver','driver@test','3','unused','driver','Active'),
    ('Suspended','suspended@test','4','unused','resident','Suspended')`);
  const tokens = {
    admin: signToken({ userId: 1, role: 'admin' }),
    resident: signToken({ userId: 2, role: 'resident' }),
    driver: signToken({ userId: 3, role: 'driver' }),
  };
  async function request(route, role, method = 'GET', body) {
    return fetch(`http://127.0.0.1:${server.address().port}${route}`, {
      method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  assert.equal((await request('/pickups')).status, 401);
  assert.equal((await request('/pickups', 'resident', 'POST', {})).status, 403);
  assert.equal((await request('/pickups/1', 'driver', 'DELETE')).status, 403);
  for (const body of [
    { weekday: 7, pickupTime: '07:00' }, { weekday: '1', pickupTime: '07:00' },
    { weekday: 1, pickupTime: '24:00' }, { weekday: 1, pickupTime: '07:00', notes: 'x'.repeat(501) },
  ]) assert.equal((await request('/pickups', 'admin', 'POST', body)).status, 400);

  const today = Number((await db.query("SELECT EXTRACT(DOW FROM NOW() AT TIME ZONE 'Africa/Lagos') AS day")).rows[0].day);
  const tomorrow = (today + 1) % 7;
  assert.equal((await request('/pickups', 'admin', 'POST', { weekday: tomorrow, pickupTime: '08:30' })).status, 200);
  await sendPickupReminders(io);
  assert.equal((await db.query('SELECT * FROM notifications')).rows.length, 0);
  assert.equal((await request('/pickups', 'admin', 'POST', { weekday: today, pickupTime: '07:00', notes: 'Tie bags securely.' })).status, 200);
  await Promise.all([sendPickupReminders(io), sendPickupReminders(io)]);
  let notifications = (await request('/notifications', 'resident')).status;
  assert.equal(notifications, 200);
  let rows = (await db.query('SELECT * FROM notifications')).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, 2);
  assert.match(rows[0].message, /07:00.*Tie bags securely/);
  assert.equal(rows[0].is_read, false);
  assert.ok(events.some(event => Array.isArray(event) && event[0] === 'user:2' && event[1] === 'notification:new'));
  assert.equal((await request(`/notifications/${rows[0].notification_id}/read`, 'driver', 'PATCH')).status, 404);
  assert.equal((await request(`/notifications/${rows[0].notification_id}/read`, 'resident', 'PATCH')).status, 200);
  await sendPickupReminders(io);
  assert.equal((await db.query('SELECT * FROM notifications')).rows[0].is_read, true);

  await request('/pickups', 'admin', 'POST', { weekday: today, pickupTime: '09:00', notes: 'Updated' });
  let schedule = await (await request('/pickups', 'resident')).json();
  assert.equal(schedule.schedules.length, 2);
  assert.equal(schedule.schedules[0].weekday, today);
  assert.equal(schedule.schedules[0].days_away, 0);
  assert.equal(schedule.schedules[0].pickup_time, '09:00');
  assert.equal(schedule.schedules[1].days_away, 1);
  await sendPickupReminders(io);
  assert.equal((await db.query('SELECT * FROM notifications')).rows.length, 1);

  await db.exec(`INSERT INTO users (full_name,email,phone,password_hash,role)
    VALUES ('New resident','new@test','5','unused','resident')`);
  await sendPickupReminders(io, 5);
  rows = (await db.query('SELECT * FROM notifications ORDER BY user_id')).rows;
  assert.equal(rows.length, 2);
  assert.match(rows[1].message, /09:00.*Updated/);
  // A previous week's reminder must not suppress today's delivery.
  await db.exec("UPDATE notifications SET pickup_date = pickup_date - 7 WHERE user_id = 2");
  await sendPickupReminders(io, 2);
  assert.equal((await db.query('SELECT * FROM notifications WHERE user_id = 2')).rows.length, 2);
  const id = schedule.schedules[0].schedule_id;
  assert.equal((await request(`/pickups/${id}`, 'admin', 'DELETE')).status, 204);
  assert.equal((await request(`/pickups/${id}`, 'admin', 'DELETE')).status, 404);
  assert.equal((await request('/pickups/invalid', 'admin', 'DELETE')).status, 400);
  await request('/pickups', 'admin', 'POST', { weekday: today, pickupTime: '10:00' });
  await sendPickupReminders(io);
  assert.equal((await db.query('SELECT * FROM notifications')).rows.length, 3);
  // Nigeria's new day starts at 23:00 UTC, regardless of database session timezone.
  const boundary = await db.query(`SELECT
    ('2026-09-07 22:59:00+00'::timestamptz AT TIME ZONE 'Africa/Lagos')::date::text AS before,
    ('2026-09-07 23:00:00+00'::timestamptz AT TIME ZONE 'Africa/Lagos')::date::text AS after`);
  assert.deepEqual(boundary.rows[0], { before: '2026-09-07', after: '2026-09-08' });
});
