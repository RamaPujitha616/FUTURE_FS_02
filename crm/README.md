# LeadFlow CRM — Full Stack Client Lead Management System

A production-ready CRM with JWT auth, role-based access, lead pipeline, analytics, and notes.

---

## Tech Stack

- **Frontend** — React 18 + Tailwind-inspired CSS (single HTML file, zero build step)
- **Backend** — Node.js + Express.js
- **Database** — MongoDB + Mongoose
- **Auth** — JWT + bcrypt

---

## Project Structure

```
crm/
├── client/
│   └── index.html          ← Complete React frontend (no build needed)
├── server/
│   ├── index.js            ← Express entry point
│   ├── models/
│   │   ├── User.js
│   │   └── Lead.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── leads.js
│   │   ├── users.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+ — https://nodejs.org
- MongoDB — https://www.mongodb.com/try/download/community (or use MongoDB Atlas free tier)

---

### Step 1 — Backend Setup

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crm_db    # or your Atlas URI
JWT_SECRET=change_this_to_a_random_64_char_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

```bash
npm install
npm run dev        # starts with nodemon (auto-reload)
# or: npm start   # production
```

Server starts at **http://localhost:5000**

---

### Step 2 — Frontend Setup

No build step needed. Just open `client/index.html` in a browser, OR serve it:

```bash
# Option A: VS Code Live Server (easiest)
# Right-click index.html → Open with Live Server

# Option B: any static server
npx serve client/
# or
cd client && python3 -m http.server 3000
```

Frontend at **http://localhost:3000** (or wherever you serve it)

---

### Step 3 — First Login

1. Open the frontend
2. Click **Create Account**
3. The **first registered user automatically becomes Admin**
4. Subsequent users get the role you select

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/leads` | JWT | List leads (paginated) |
| POST | `/api/leads` | JWT | Create lead |
| GET | `/api/leads/:id` | JWT | Get lead detail |
| PUT | `/api/leads/:id` | JWT | Update lead |
| DELETE | `/api/leads/:id` | Admin/Manager | Delete lead |
| POST | `/api/leads/:id/notes` | JWT | Add note to lead |
| GET | `/api/leads/export/csv` | Admin/Manager | Export leads CSV |
| GET | `/api/users` | Admin/Manager | List users |
| POST | `/api/users` | Admin | Create user |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| GET | `/api/dashboard/stats` | JWT | Dashboard analytics |

---

## Role-Based Access

| Feature | Admin | Manager | Sales |
|---------|-------|---------|-------|
| View all leads | ✅ | ✅ | Own only |
| Create leads | ✅ | ✅ | ✅ |
| Edit leads | ✅ | ✅ | ✅ |
| Delete leads | ✅ | ✅ | ❌ |
| Export CSV | ✅ | ✅ | ❌ |
| View all users | ✅ | ✅ | ❌ |
| Create/Delete users | ✅ | ❌ | ❌ |
| Dashboard analytics | ✅ | ✅ | Own stats |

---

## Features

### Authentication
- JWT-based login/register
- bcrypt password hashing (cost factor 12)
- Role-based route protection
- Auto-admin for first registered user

### Lead Management
- Full CRUD with search, filters, pagination
- Status pipeline: New → Contacted → Qualified → Proposal → Negotiation → Converted/Lost
- Priority levels: Low / Medium / High
- Auto lead scoring (0–100) based on status + priority
- Deal value tracking
- Assign leads to team members
- Tags support
- CSV export

### Notes & Activity
- Per-lead notes with author + timestamp
- Activity timeline (created, status changes, notes)
- Full note history view

### Dashboard & Analytics
- Total leads, conversion rate, pipeline value
- Monthly trend chart
- Lead source breakdown
- Status distribution
- Recent leads list

### User Management (Admin)
- Create / edit / deactivate users
- Assign roles (Admin, Manager, Sales)
- Last login tracking

---

## Deployment

### Backend → Render.com

1. Push `server/` to a GitHub repo
2. Create a new **Web Service** on Render
3. Set:
   - Build command: `npm install`
   - Start command: `node index.js`
4. Add Environment Variables (same as `.env`), using:
   - MongoDB Atlas URI for `MONGODB_URI`
   - Strong random string for `JWT_SECRET`
   - Your Vercel frontend URL for `CLIENT_URL`

### Frontend → Vercel / Netlify

1. Upload `client/index.html`
2. Update the `API_BASE` constant in `index.html`:
   ```js
   const API_BASE = 'https://your-render-url.onrender.com/api';
   ```
3. Deploy as a static site

### MongoDB Atlas (Free)

1. Create account at https://cloud.mongodb.com
2. Create a free M0 cluster
3. Add database user + whitelist `0.0.0.0/0` (or Render's IPs)
4. Copy the connection string → use as `MONGODB_URI`

---

## Environment Variables Reference

```env
PORT=5000                          # Server port
MONGODB_URI=mongodb://...          # MongoDB connection string
JWT_SECRET=random64chars           # JWT signing secret (keep private!)
JWT_EXPIRES_IN=7d                  # Token expiry
NODE_ENV=development               # or: production
CLIENT_URL=http://localhost:3000   # Frontend URL (for CORS)
```

---

## Security Notes

- Change `JWT_SECRET` to a cryptographically random 64+ character string in production
- Use HTTPS in production (Render and Vercel handle this automatically)
- Passwords are hashed with bcrypt (cost factor 12)
- Rate limiting: 100 requests per 15 minutes per IP
- Input validation on all endpoints
- Role-based authorization on sensitive routes

---

## Extending the App

### Add React Router (multi-page)
```bash
cd client && npm create vite@latest . -- --template react
npm install react-router-dom axios
```

### Add Email (Nodemailer)
```bash
cd server && npm install nodemailer
```

### Add File Uploads
```bash
cd server && npm install multer
```

### Real-time Notifications (Socket.io)
```bash
npm install socket.io   # server
npm install socket.io-client  # client
```
