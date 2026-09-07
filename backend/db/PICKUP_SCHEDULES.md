# Pickup schedule rollout

Run `npm run db:migrate` from `backend` against the intended database before
starting the updated backend. The existing migration runner applies the additive,
repeatable changes in `schema.sql`: `pickup_schedules`, an optional notification
date, and a unique resident/date index. Existing notifications are preserved.
Test on a development database branch before production rollout.

Administrators open **Pickup days**, choose a weekday, set the preparation time,
and optionally add instructions. Saving an existing weekday updates it; Remove
stops future pickups on that day. The weekly schedule applies to all residents.
Residents see today's collection banner and the upcoming weekly days above
their reporting form. All dates and times use `Africa/Lagos` (WAT).

The backend checks on startup and every minute. Each active resident gets one
persistent in-app reminder per Nigeria calendar date. Fetching notifications also
checks the current day, covering new accounts and backend wake-up. Notifications
are sent through the existing private Socket.IO rooms; clients also refresh every
minute and on window focus/reconnection. Reminders are in-app, not SMS or browser
push. The backend must be running to generate them on time. If it is offline for
an entire pickup day, that missed day's reminders are not backfilled.

Editing or removing a pickup does not erase an already delivered reminder or send
a second one that day; the calendar shows the current details. Recreating a day
also does not duplicate reminders.

API: authenticated `GET /api/pickups`; administrator-only `POST /api/pickups`
with `{ weekday: 0..6, pickupTime: "HH:mm", notes: "..." }` (Sunday is 0),
and `DELETE /api/pickups/:id`. Changes emit `pickup:updated`; newly inserted
reminders emit private `notification:new` events.

Run `npm test` in `backend` for isolated PostgreSQL engine tests. These exercise
the migration twice, real HTTP routes/JWT authorization, input validation,
schedule ordering and updates, notification ownership, active-resident targeting,
concurrent duplicate prevention, read persistence, new residents, recurring days,
deletion/recreation, and the Nigeria midnight boundary without a live database.
