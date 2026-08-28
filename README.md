# ESWAMA Real-Time Waste Management & Tracking System

A full-stack, real-time web application built for the **Enugu State Waste Management Authority (ESWAMA)**. The system provides intelligent waste reporting for residents, live GPS location tracking and route navigation for collection drivers, and an administrative command center with automated nearest-driver assignment and user/fleet management.

---

## 📚 Complete Project Documentation

| Document | Description |
| :--- | :--- |
| **[Architecture Guide (`ARCHITECTURE.md`)](ARCHITECTURE.md)** | System topology, Socket.IO rooms, real-time event lifecycle & REST API catalog |
| **[Database & Data Dictionary (`DATABASE.md`)](DATABASE.md)** | Entity-Relationship Diagram (ERD), full SQL table schemas, indexing & Haversine formula |
| **[Authentication & Security (`AUTHENTICATION.md`)](AUTHENTICATION.md)** | JWT implementation, Bcrypt password hashing, RBAC permissions matrix & account suspension |
| **[System Audit & Verification (`AUDIT.md`)](AUDIT.md)** | Security audit, SQL injection review, and compliance verification against final year thesis |
| **[Live Deployment Guide (`deployment.md`)](deployment.md)** | Step-by-step instructions for Vercel (Frontend) and Render (Backend) |
| **[Testing & Demo Guide (`testing.md`)](testing.md)** | Complete end-to-end evaluation manual with pre-seeded demo user credentials |

---

## System Architecture & Features

```
┌────────────────────────┐      WebSocket / REST API      ┌────────────────────────┐
│  Resident Web App      │ ◄────────────────────────────► │  Express.js Backend    │
│  - GPS Waste Reporting │                                │  - RESTful Controllers │
│  - Live Status Updates │                                │  - Socket.IO Server    │
└────────────────────────┘                                │  - Haversine Matching  │
                                                          └───────────┬────────────┘
┌────────────────────────┐      WebSocket / REST API                  │
│  Driver Web App        │ ◄──────────────────────────────────────────┤
│  - Live GPS Streaming  │                                            │
│  - Route Map & Tasks   │                                ┌───────────▼────────────┐
│  - Google Maps Nav     │                                │  PostgreSQL Database   │
└────────────────────────┘                                │  (Neon Serverless DB)  │
                                                          └────────────────────────┘
┌────────────────────────┐      WebSocket / REST API                  │
│  Admin Web Center      │ ◄──────────────────────────────────────────┘
│  - Live Fleet Map      │
│  - Smart Dispatch      │
│  - User/Driver Control │
└────────────────────────┘
```

### 1. Resident Portal
- **Interactive Waste Reporting**: Pinpoint illegal dumpsites or overflowing bins directly on an interactive Leaflet/OpenStreetMap.
- **HTML5 Live Geolocation**: One-click **"Use My Current Location"** button automatically fetches device GPS coordinates and centers the map.
- **Live Status Tracking**: Watch reports move in real time from `Pending` → `Assigned` → `Resolved` via WebSocket push notifications.
- **Public Registration**: Dedicated self-service signup for community residents.

### 2. Driver / Collector Portal
- **Live Route Map**: Visual overview of the driver's current position and all active assigned collection tasks.
- **GPS Location Streaming**: Real-time periodic geolocation push (`location:push`) streaming coordinates to the central fleet map.
- **Google Maps Navigation**: One-click **"Track on Map"** integration opens turn-by-turn directions from the driver's current GPS location directly to the resident's reported waste site.
- **Task Workflow Progression**: Step-by-step status transitions (`Assigned` → `In Progress` → `Completed`) with automated notifications dispatched to residents upon task completion.

### 3. Administrator Command Center
- **Live Fleet Tracking Map**: Real-time tracking of all active collection trucks across Enugu State zones.
- **Nearest-Driver Matching (Haversine Algorithm)**: Automatically calculates the closest available driver with active GPS coordinates to any pending waste report.
- **Instant Dispatch**: Single-click task assignment dispatches real-time socket events directly to the assigned driver.
- **Google Maps Inspection**: One-click **"View on Google Maps"** link to inspect exact coordinates of any pending report.
- **Fleet & User Management**:
  - Provision new Drivers and Administrators.
  - Suspend and Reactivate driver accounts in real time.
  - Delete user accounts with database safety constraints preserving historical collection records.

---

## Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 18 + Vite | High-performance SPA with client-side routing (`react-router-dom`) |
| **Styling** | Tailwind CSS | Responsive, modern utility-first UI styling |
| **Maps & GIS** | Leaflet + React-Leaflet + Google Maps | Zero-cost OpenStreetMap tiles with Google Maps navigation redirects |
| **Backend API** | Node.js + Express.js | Modular RESTful API with structured controllers and middleware |
| **Real-Time Engine** | Socket.IO (`v4`) | Low-latency bi-directional WebSocket streaming and event rooms |
| **Database** | PostgreSQL (Neon Cloud / Local) | Relational schema with foreign keys, spatial coordinates, and indexes |
| **Authentication** | JWT + bcryptjs | Token-based auth with role-based access control (`resident`, `driver`, `admin`) |

---

## Project Structure

```
eswama-waste-system/
├── backend/
│   ├── db/
│   │   ├── schema.sql           # PostgreSQL table schemas & foreign key constraints
│   │   ├── seed.sql             # SQL seed template
│   │   ├── seed.js              # Programmatic demo account seeder (bcrypt)
│   │   └── migrate.js           # Automated schema migration runner
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # Neon SSL & connection pool configuration
│   │   ├── controllers/
│   │   │   ├── authController.js       # Register, login, user management
│   │   │   ├── locationController.js   # GPS location ingestion & retrieval
│   │   │   ├── notificationController.js# User notifications
│   │   │   ├── reportController.js     # Waste report management
│   │   │   └── taskController.js       # Task dispatch & nearest-driver matching
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification & role authorization
│   │   ├── routes/              # Express API route declarations
│   │   ├── sockets/             # Socket.IO room connections & real-time events
│   │   ├── utils/
│   │   │   ├── geo.js           # Haversine distance calculator
│   │   │   └── jwt.js           # Token signing & verification
│   │   └── server.js            # Express & HTTP/Socket server entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js        # Axios instance with JWT interceptors
│   │   │   └── socket.js        # Socket.IO client connection manager
│   │   ├── components/
│   │   │   ├── MapView.jsx      # Reusable Leaflet map with custom markers
│   │   │   ├── Navbar.jsx       # Responsive header with role badges & logout
│   │   │   └── ProtectedRoute.jsx# Role-gated route protection
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state & user session persistence
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx    # Fleet tracking, smart dispatch & user management
│   │   │   ├── DriverDashboard.jsx   # Live route map, GPS toggle & task actions
│   │   │   ├── Home.jsx              # Landing page with system overview
│   │   │   ├── Login.jsx             # Secure login
│   │   │   ├── Register.jsx          # Public resident registration
│   │   │   └── ResidentDashboard.jsx # Waste reporting form & report history
│   │   ├── App.jsx              # Route definitions
│   │   └── main.jsx             # React DOM root
│   ├── .env.example
│   ├── vercel.json              # SPA URL rewrites for Vercel deployment
│   └── package.json
├── deployment.md                # Full Railway + Vercel deployment guide
├── testing.md                   # Step-by-step testing manual
└── README.md
```

---

## Local Development Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- PostgreSQL database (Local PostgreSQL or a cloud [Neon Database](https://neon.tech))

### 1. Backend Setup

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Configure `backend/.env`:
   ```ini
   DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx.neon.tech/neondb?sslmode=require
   JWT_SECRET=super_secret_jwt_key_at_least_32_characters
   PORT=4000
   CLIENT_ORIGIN=http://localhost:5173
   ```

4. Install dependencies, apply database schema, and seed default accounts:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server starts on `http://localhost:4000` with WebSocket support.*

---

### 2. Frontend Setup

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Ensure `frontend/.env` has:
   ```ini
   VITE_API_BASE_URL=http://localhost:4000/api
   VITE_SOCKET_URL=http://localhost:4000
   ```

4. Install dependencies and start Vite:
   ```bash
   npm install
   npm run dev
   ```
   *The frontend will launch on `http://localhost:5173`.*

---

## Default Seeded Accounts

When you run `npm run db:seed`, the following test accounts are automatically provisioned:

| Role | Email | Password | Assigned Vehicle |
|---|---|---|---|
| **Administrator** | `admin@eswama.gov.ng` | `password123` | N/A (Admin Command) |
| **Driver / Collector** | `driver@eswama.gov.ng` | `password123` | `ENU-234-XY` (Independence Layout) |
| **Resident** | `resident@eswama.gov.ng` | `password123` | N/A |

---

## API Reference

### Authentication & User Management
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new Resident account |
| `POST` | `/api/auth/login` | Public | Login with email and password |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/api/auth/users` | Admin Only | List all system users |
| `POST` | `/api/auth/users` | Admin Only | Provision a new Driver or Admin |
| `PATCH` | `/api/auth/users/:id/status` | Admin Only | Suspend or Activate a user |
| `DELETE` | `/api/auth/users/:id` | Admin Only | Delete user (blocked if tasks exist) |

### Waste Reports & Locations
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/reports` | Resident | Submit a new waste report with GPS coordinates |
| `GET` | `/api/reports` | Resident/Admin | List user reports or all pending reports |
| `POST` | `/api/locations` | Driver | Push driver vehicle location coordinate |
| `GET` | `/api/locations/latest` | Admin/Resident | Fetch latest known locations of active vehicles |

### Collection Tasks & Smart Dispatch
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks/nearest-driver?reportId=:id` | Admin | Compute closest available driver via Haversine |
| `POST` | `/api/tasks` | Admin | Assign waste report to driver |
| `GET` | `/api/tasks` | Driver/Admin | List assigned collection tasks |
| `PATCH` | `/api/tasks/:id/status` | Driver | Advance status (`In Progress` / `Completed`) |

---

## Real-Time WebSocket Events

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `location:push` | Client → Server | `{ latitude, longitude }` | Driver broadcasting live GPS position |
| `location:update` | Server → Client | `{ vehicleId, lat, lng }` | Server broadcasting vehicle position to admins |
| `report:new` | Server → Client | `{ reportId, description, lat, lng }` | Broadcast to admins when a new report is filed |
| `task:assigned` | Server → Driver Room | `{ taskId, reportId, ... }` | Direct push notification to assigned driver |
| `report:resolved` | Server → Resident Room | `{ reportId }` | Direct push notification to resident on completion |

---

## Additional Documentation Guides

- [Live Deployment Guide (Railway + Vercel)](./deployment.md) - Step-by-step guide for hosting the database on Neon, backend on Railway, and frontend on Vercel.
- [Testing Manual](./testing.md) - Complete end-to-end testing scenarios including multi-browser real-time simulation.