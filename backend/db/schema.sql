-- ESWAMA Real Time Waste Management and Tracking System
-- PostgreSQL schema (matches the ERD in Chapter 3.6.5 of the project report)

CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('resident', 'admin', 'driver')),
    status          VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_reports (
    report_id       SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    photo_url       TEXT,
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Assigned', 'Resolved')),
    reported_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id      SERIAL PRIMARY KEY,
    plate_number    VARCHAR(20) UNIQUE NOT NULL,
    driver_id       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    zone            VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active', 'Under Maintenance', 'Inactive'))
);

CREATE TABLE IF NOT EXISTS collection_tasks (
    task_id         SERIAL PRIMARY KEY,
    report_id       INTEGER NOT NULL REFERENCES waste_reports(report_id) ON DELETE CASCADE,
    driver_id       INTEGER NOT NULL REFERENCES users(user_id),
    assigned_by     INTEGER NOT NULL REFERENCES users(user_id),
    status          VARCHAR(20) NOT NULL DEFAULT 'Assigned'
                        CHECK (status IN ('Assigned', 'In Progress', 'Completed')),
    assigned_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_locations (
    location_id     SERIAL PRIMARY KEY,
    vehicle_id      INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    recorded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message          TEXT NOT NULL,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes to speed up common queries (status filters, proximity lookups)
CREATE INDEX IF NOT EXISTS idx_waste_reports_status ON waste_reports(status);
CREATE INDEX IF NOT EXISTS idx_waste_reports_user ON waste_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_driver ON collection_tasks(driver_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_status ON collection_tasks(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- One recurring collection window per weekday (0 = Sunday), in Africa/Lagos.
CREATE TABLE IF NOT EXISTS pickup_schedules (
    schedule_id SERIAL PRIMARY KEY,
    weekday INTEGER NOT NULL UNIQUE CHECK (weekday BETWEEN 0 AND 6),
    pickup_time TIME NOT NULL,
    notes VARCHAR(500) NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep the delivery key independent of schedules so editing/recreating a day
-- cannot send duplicate reminders. Existing notifications remain compatible.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS pickup_date DATE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_pickup_day
    ON notifications(user_id, pickup_date) WHERE pickup_date IS NOT NULL;
