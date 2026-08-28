# End-to-End Testing Manual: ESWAMA Waste System

This testing manual guides you through validating all user flows, role permissions, real-time WebSockets, live GPS tracking, photo uploads, analytics dashboards, and Google Maps integrations across the system.

---

## 1. Initial Setup & Test Accounts

### Step 1: Run Migration and Seed Scripts (Local / Neon Database)
Ensure your database schema is up-to-date and populated with the default test accounts:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

### Pre-configured Test Accounts
All seeded accounts use the password: `password123`

| User Role | Email | Password | Pre-assigned Vehicle | Live Dashboard URL |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin@eswama.gov.ng` | `password123` | N/A | `https://eswama-waste.vercel.app/admin` |
| **Driver / Collector** | `driver@eswama.gov.ng` | `password123` | `ENU-234-XY` | `https://eswama-waste.vercel.app/driver` |
| **Resident** | `resident@eswama.gov.ng` | `password123` | N/A | `https://eswama-waste.vercel.app/resident` |

---

## 2. Testing Scenarios

### Scenario 1: Admin Fleet & User Management
**Objective:** Verify that an Admin can create new Driver accounts, suspend/reactivate them, and test account deletion safeguards.

1. Navigate to `https://eswama-waste.vercel.app/login` (or `http://localhost:5173/login`).
2. Log in with **Admin** credentials:
   - **Email:** `admin@eswama.gov.ng`
   - **Password:** `password123`
3. In the top navigation bar, click the **"Manage Drivers & Admins"** tab.
4. **Create a New Driver:**
   - In the **Add New User** form on the left:
     - **Full Name:** `Emeka Nwosu`
     - **Email:** `emeka.driver@eswama.gov.ng`
     - **Phone:** `08031234567`
     - **Password:** `password123`
     - **Role:** Select `Driver`
   - Click **"Create User"**.
   - **Expected Result:** A success message *"User created successfully"* appears, and the new driver appears in the table on the right.
5. **Test Account Suspension:**
   - Locate `Emeka Nwosu` in the user table.
   - Click the **"Suspend"** button next to their name.
   - **Expected Result:** The status badge changes from `Active` (green) to `Suspended` (red).
   - *Verification:* Open a new private/incognito window, go to `/login`, and attempt to log in with `emeka.driver@eswama.gov.ng`. An error message *"Your account has been suspended. Please contact the administrator."* will prevent login.
6. **Test Account Reactivation:**
   - Return to the Admin window and click **"Activate"**.
   - **Expected Result:** The badge returns to `Active`. The driver can now successfully log in.
7. **Test Deletion Safety Constraint:**
   - Click **"Delete"** next to `Chidi Driver` (`driver@eswama.gov.ng`).
   - Confirm the popup prompt.
   - **Expected Result:** If the driver has active or historical collection tasks, the system safely prevents deletion and displays an error advising you to suspend them instead, preserving historical records.

---

### Scenario 2: Public Resident Registration & Login
**Objective:** Verify that public signups only permit `resident` accounts and enforce security constraints.

1. Open `https://eswama-waste.vercel.app/register` in an incognito window or log out.
2. Notice that the registration form does not allow selecting Admin or Driver roles; it is restricted to residents.
3. Fill out the registration form:
   - **Full Name:** `Ngozi Okeke`
   - **Email:** `ngozi@example.com`
   - **Phone:** `08098765432`
   - **Password:** `password123`
4. Click **"Register"**.
5. **Expected Result:** The account is created and the user is automatically redirected to the Resident Dashboard (`/resident`).

---

### Scenario 3: Resident Waste Reporting, Photo Upload & Live Geolocation
**Objective:** Verify photo attachment, HTML5 live geolocation, and map pin placement for waste reporting.

1. In the Resident Dashboard (`/resident`), under **"Report a Waste Issue"**:
2. Type a description:
   ```text
   Overflowing commercial dumpster blocking access road near Holy Ghost Cathedral.
   ```
3. **Test Photo Upload:**
   - Click **"Choose File"** under *Add a photo (optional)*.
   - Select any image (`.jpg`, `.png`).
   - **Expected Result:** An instant thumbnail preview of your selected photo appears right below the file input.
4. **Test HTML5 Live Geolocation:**
   - Click the **"Use My Current Location"** button above the map.
   - When the browser asks for permission (*"wants to know your location"*), click **Allow**.
   - **Expected Result:** The map automatically centers on your exact GPS coordinates and places a marker with green *"Location acquired!"* text.
5. Click **"Submit Report"**.
6. **Expected Result:** 
   - A success message *"Report submitted successfully"* appears.
   - The new report appears in the **"Your Reports"** list on the right with a `Pending` status badge and your uploaded photo displayed.

---

### Scenario 4: Admin Smart Dispatch & Google Maps Inspection
**Objective:** Verify real-time report arrival, attached photo inspection, Google Maps link, and nearest-driver calculation.

1. Switch to the **Administrator** browser window (`/admin`).
2. Under the **"Dashboard Overview"** tab:
   - Notice the new report submitted by `Ngozi Okeke` has arrived **in real time** in the **"Pending Reports"** list without refreshing the page!
   - Notice the uploaded photo is rendered cleanly with the report.
3. Click on the pending report:
   - The report card highlights in green.
   - **Test Google Maps Inspection:** Click the **"View on Google Maps"** link. A new tab opens showing Google Maps centered at the exact coordinates of the waste issue.
4. **Test Nearest-Driver Suggestion:**
   - If an active driver has shared their GPS location, the Haversine calculation displays:
     ```text
     Suggested driver: Chidi Driver (0.42 km away)
     ```
5. Click **"Assign This Driver"**.
6. **Expected Result:**
   - The report status updates to `Assigned`.
   - A task is created and dispatched immediately via WebSockets to the assigned driver.

---

### Scenario 5: Driver Live Route Map, GPS Streaming & Navigation
**Objective:** Verify real-time task arrival on the driver's dashboard, GPS streaming, and Google Maps turn-by-turn navigation.

1. In a separate browser window, log in as the **Driver**:
   - **Email:** `driver@eswama.gov.ng`
   - **Password:** `password123`
2. **Test Real-Time Task Notification:**
   - Notice the new task assigned by the Admin appears immediately under **"Your Tasks"**.
3. **Test Live GPS Sharing:**
   - Under **Location Sharing**, click **"Start Sharing"**.
   - Allow location access when prompted.
   - **Expected Result:** The button turns red (*"Stop Sharing"*), and your live GPS coordinates are continuously broadcast to the backend.
4. **Test Route Map:**
   - The **"Your Route Map"** component displays your current live location marker and the marker of the assigned waste site.
5. **Test Google Maps Navigation Integration:**
   - On the task card, click the blue **"Track on Map"** button.
   - **Expected Result:** A new tab opens in Google Maps with turn-by-turn navigation routed directly from the driver's current live GPS position to the resident's reported location!
6. **Test Task Progression:**
   - Click **"Mark as In Progress"**. The task badge updates to `In Progress`.
   - Complete the collection and click **"Mark as Completed"**.

---

### Scenario 6: Real-Time Resolution Notification for Residents
**Objective:** Verify that resolving a task automatically updates the resident's dashboard in real time.

1. Keep the **Resident Dashboard** window visible.
2. When the driver clicks **"Mark as Completed"** in Scenario 5:
3. **Expected Result:**
   - The resident's report status instantly changes from `Assigned` to `Resolved` (green badge) without reloading the page!

---

### Scenario 7: In-App Notification Feed (Bell Icon)
**Objective:** Verify the real-time notification bell dropdown and read status tracking.

1. Look at the top navigation bar next to your username.
2. Notice the **Notification Bell** icon with a red numeric badge showing unread notification count.
3. Click the bell icon:
   - A dropdown opens displaying recent notification cards (e.g. *"Your waste report has been resolved. Thank you for reporting it."*).
4. Click on any unread notification card.
5. **Expected Result:** The card background turns from blue to white, and the unread count decrements by 1.

---

### Scenario 8: Analytics & Reporting Module
**Objective:** Verify the Administrator's operational intelligence dashboard and Recharts visualizations.

1. In the **Admin Dashboard** (`/admin`), click the **"Analytics & Reports"** tab.
2. **Key Metric Cards:** Verify that the 3 summary metric cards reflect live data:
   - **Pending Reports** count.
   - **Total Resolved** count.
   - **Avg Resolution Time** (computed in hours from report creation to task completion).
3. **Reports Over Time (Line Chart):** Verify the 7-day timeline graph showing daily incoming volume trends.
4. **Reports by Status (Bar Chart):** Inspect the comparative bar chart illustrating the distribution between `Pending`, `Assigned`, and `Resolved`.
5. **Driver Performance Leaderboard:** Verify that completed tasks are accurately aggregated per driver name.

---

## 3. Multi-Browser Demonstration Matrix

To demonstrate the full real-time power of Socket.IO during a live project defence or presentation, open 3 side-by-side browser windows:

```
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│  Window 1: Resident    │  │  Window 2: Admin       │  │  Window 3: Driver      │
│  (Chrome Normal)       │  │  (Chrome Incognito)    │  │  (Firefox / Edge)      │
│  resident@eswama...    │  │  admin@eswama.gov.ng   │  │  driver@eswama.gov.ng  │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

1. **Step A:** Resident attaches a photo, clicks **"Use My Current Location"**, and clicks **"Submit Report"**.
2. **Step B:** Admin instantly sees the report pop up in **Pending Reports** with photo and location.
3. **Step C:** Admin clicks **"Assign This Driver"**.
4. **Step D:** Driver immediately sees the task pop up on their **Route Map** and gets a notification alert.
5. **Step E:** Driver clicks **"Track on Map"** to navigate via Google Maps, then clicks **"Mark as Completed"**.
6. **Step F:** Resident immediately sees their report transition to **Resolved** and receives a notification in their bell feed.
