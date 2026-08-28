# Live Deployment Guide: ESWAMA Waste System

This guide walks you through deploying the **ESWAMA Waste Management & Tracking System** to production using:
1. **Neon** — Serverless cloud PostgreSQL database.
2. **Render / Railway** — Persistent Node.js + Socket.IO backend service.
3. **Vercel** — Fast React (Vite) single-page application (SPA) hosting.

---

## Architecture in Production

```
   ┌──────────────────────────────────────────────┐
   │             Vercel (Frontend)                │
   │      https://eswama-waste.vercel.app         │
   └───────────────┬──────────────────────────────┘
                   │
                   │ HTTPS API Requests & WSS WebSockets
                   ▼
   ┌──────────────────────────────────────────────┐
   │             Railway (Backend)                │
   │      https://eswama-api.up.railway.app       │
   └───────────────┬──────────────────────────────┘
                   │
                   │ SSL Pooled / Direct Connection
                   ▼
   ┌──────────────────────────────────────────────┐
   │         Neon (PostgreSQL Database)           │
   │ ep-snowy-fog-b2wcviks-pooler.neon.tech       │
   └──────────────────────────────────────────────┘
```

---

## Step 1: Database Setup (Neon PostgreSQL)

1. Sign in to your [Neon Console](https://console.neon.tech/).
2. Select your project (e.g. `eswama-waste`).
3. Under **Dashboard / Connection Details**, copy your connection string:
   ```text
   postgresql://neondb_owner:YOUR_PASSWORD@ep-snowy-fog-b2wcviks-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. If you have not initialized the tables and seed data yet, you can run the migration script locally using your connection string:
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```
   *This creates all required tables (`users`, `waste_reports`, `vehicles`, `collection_tasks`, `vehicle_locations`, `notifications`) and provisions the default administrator and demo driver.*

---

## Step 2: Backend Deployment on Railway

Railway is recommended for the backend because it natively supports persistent WebSocket connections (`Socket.IO`), long-lived HTTP servers, and automatic HTTPS.

### 1. Create a New Project on Railway
1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **"+ New Project"** → **"Deploy from GitHub repo"**.
3. Select your repository `eswama-waste-system`.

### 2. Configure the Service Root Directory
Since your repository contains both frontend and backend in one repository:
1. In the Railway dashboard, click on your service box.
2. Go to the **"Settings"** tab.
3. Scroll down to **"Root Directory"** and set it to:
   ```text
   /backend
   ```
4. Scroll to **"Build & Start Command"**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Add Production Environment Variables
Under the **"Variables"** tab in Railway, add the following key-value pairs:

| Variable Name | Example Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-xxx-pooler.neon.tech/neondb?sslmode=require` | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | `postgresql://neondb_owner:...@ep-xxx.neon.tech/neondb?sslmode=require` | Neon unpooled connection string (optional) |
| `JWT_SECRET` | `generate_a_random_32_character_string_here` | Secret key for signing tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `PORT` | `4000` | Port for Express (Railway also injects `PORT`) |
| `CLIENT_ORIGIN` | `https://your-frontend.vercel.app` *(or `*` during initial testing)* | Allowed origins for CORS and Socket.IO |
| `NODE_ENV` | `production` | Node environment |

> [!TIP]
> You can temporarily set `CLIENT_ORIGIN=*` during initial setup. Once Vercel provides your frontend URL, update `CLIENT_ORIGIN` to your exact Vercel domain (e.g. `https://eswama-waste.vercel.app`).

### 4. Generate Public Domain
1. In Railway under **Settings** → **Networking**, click **"Generate Domain"**.
2. Railway will give you a public URL such as:
   ```text
   https://eswama-waste-backend-production.up.railway.app
   ```
3. Test your deployed backend by opening the health endpoint in your browser:
   ```text
   https://eswama-waste-backend-production.up.railway.app/api/health
   ```
   You should see: `{"status":"ok","service":"eswama-waste-system-api"}`.

---

## Step 3: Frontend Deployment on Vercel

### 1. Import Repository into Vercel
1. Go to [Vercel](https://vercel.com/) and sign in with GitHub.
2. Click **"Add New..."** → **"Project"**.
3. Select your repository `eswama-waste-system`.

### 2. Configure Project Settings
In the configuration screen:
1. **Framework Preset**: `Vite`
2. **Root Directory**: Click **Edit** and select `frontend`.
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `dist` (default)
5. **Install Command**: `npm install` (default)

### 3. Set Frontend Environment Variables
Expand the **"Environment Variables"** section and add:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://eswama-waste-backend-production.up.railway.app/api` | Railway API base URL (must end in `/api`) |
| `VITE_SOCKET_URL` | `https://eswama-waste-backend-production.up.railway.app` | Railway base URL (without `/api`) |

### 4. Deploy & Verify
1. Click **"Deploy"**.
2. Vercel will build the frontend and output your production domain:
   ```text
   https://eswama-waste.vercel.app
   ```
3. Copy this Vercel domain and return to **Railway** → **Variables** to update `CLIENT_ORIGIN` to `https://eswama-waste.vercel.app`.

---

## Step 4: Post-Deployment Verification Checklist

1. **SPA Routing**:
   - Navigate directly to `https://your-frontend.vercel.app/login` and refresh the page. 
   - Thanks to `frontend/vercel.json`, you should not get a `404 Not Found` error.

2. **CORS & Authentication**:
   - Log in using the administrator credentials (`admin@eswama.gov.ng` / `password123`).
   - Open browser developer tools (F12) → **Console** to ensure there are no CORS errors.

3. **WebSocket Connection**:
   - Check the **Network** tab, filter by `WS` (WebSockets).
   - You should see an active 101 Switching Protocols connection to your Railway domain.

4. **Live Geolocation (HTTPS)**:
   - Modern browsers require HTTPS to grant geolocation permissions. Since both Vercel and Railway use SSL/HTTPS out of the box, clicking **"Use My Current Location"** will prompt for GPS access and center the map accurately.

---

## Common Deployment Troubleshooting

### Issue 1: `AxiosError 404 on API requests`
- **Cause**: `VITE_API_BASE_URL` is missing the `/api` suffix.
- **Fix**: Ensure `VITE_API_BASE_URL` is set to `https://your-railway-url.up.railway.app/api`.

### Issue 2: `WebSocket Connection to 'wss://...' failed`
- **Cause**: `VITE_SOCKET_URL` is set with a trailing `/api` or `CLIENT_ORIGIN` on Railway does not match your Vercel URL.
- **Fix**: Ensure `VITE_SOCKET_URL` is `https://your-railway-url.up.railway.app` and `CLIENT_ORIGIN` on Railway matches `https://your-frontend.vercel.app`.

### Issue 3: `Database SSL self-signed certificate error`
- **Cause**: Neon requires TLS connections.
- **Fix**: The backend is already pre-configured to detect `neon.tech` and `sslmode=require` and enable `{ rejectUnauthorized: false }`. Ensure your connection string includes `?sslmode=require`.
