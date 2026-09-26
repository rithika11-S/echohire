# EchoHire — Full-Stack Accessible Employment Platform

EchoHire is an accessibility-first job portal for visually impaired professionals, featuring complete voice navigation, high-contrast visual themes, screen-reader optimizations (WCAG 2.1 AA), and the **Echo Assistant** AI accessibility guide.

---

## 📁 Full-Stack Architecture

The repository is organized into completely separate `frontend/` and `backend/` directories:

```
job_pro/
├── backend/              # Node.js + Express + MongoDB REST API (Port 5000)
│   ├── src/
│   │   ├── config/        # Database connection & seeding
│   │   ├── models/        # Mongoose schemas (User, Job, Application, SavedJob)
│   │   ├── routes/        # Health, Jobs, Saved Jobs, Applications, Auth routes
│   │   ├── middleware/    # Auth middleware & JWT verification
│   │   └── server.js      # Express server entry point
│   ├── .env.example       # Template with environment variables
│   ├── .gitignore
│   ├── package.json
│   └── package-lock.json
│
├── frontend/             # React + Vite application (Port 5173)
│   ├── src/
│   │   ├── accessibility/ # Page introduction & screen reader announcements
│   │   ├── assistant/     # Echo Assistant AI accessibility suite
│   │   ├── components/    # Accessible React UI components
│   │   ├── context/       # AuthContext & AccessibilityContext
│   │   ├── services/      # API client service talking to backend
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   ├── .env               # VITE_API_URL=http://localhost:5000
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js     # Proxy to http://localhost:5000
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Instructions

Frontend and backend run independently in their respective directories.

### 1. Start Backend Server (`http://localhost:5000`)

```bash
cd backend
npm install
npm run dev
```

The backend connects to MongoDB (default: `mongodb://127.0.0.1:27017/echohire`).
Verify backend health at: `http://localhost:5000/api/health`

---

### 2. Start Frontend Client (`http://localhost:5173`)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open your browser at: `http://localhost:5173`

---

## 📡 REST API Endpoints

- **Health Check**: `GET /api/health`
- **Jobs**:
  - `GET /api/jobs` (Supports `?q=`, `?skill=`, `?location=`, `?workMode=`, `?jobType=`)
  - `GET /api/jobs/:id`
  - `POST /api/jobs`
  - `PUT /api/jobs/:id`
  - `DELETE /api/jobs/:id`
- **Saved Jobs**:
  - `GET /api/saved-jobs/:userId`
  - `POST /api/saved-jobs`
  - `DELETE /api/saved-jobs/:userId/:jobId`
- **Applications**:
  - `GET /api/applications/:userId`
  - `POST /api/applications`
  - `PUT /api/applications/:id/status`
- **Authentication & Users**:
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
  - `GET /api/auth/users/:id`
  - `PUT /api/auth/users/:id`

---

## ♿ Accessibility & Echo Assistant

- **Voice Assistant**: Floating **Echo Assistant** widget supporting natural voice commands (*"What is on this page?"*, *"Explain this job"*, *"Apply for this job"*).
- **Guided Application**: Multi-step voice-guided application process for visually impaired users.
- **Screen Reader Support**: `aria-live="polite"` announcements and keyboard navigation shortcuts (`Alt + Shift + I`).
