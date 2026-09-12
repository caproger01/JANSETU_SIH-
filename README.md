# JanSetu (जनसेतु) - Full-Stack Civic & Governance Portal

JanSetu is a comprehensive civic platform bridging **Citizens**, **Government Bodies**, **Universities**, and **Industry Partners** to report civic issues, manage administrative resolution, publish research challenges, and fund innovations via Corporate Social Responsibility (CSR).

---

## Architecture & Tech Stack

- **Frontend**: React 18 + Vite (rontend/)
  - Preserved authentic Indian Government portal design language (#075844, saffron accents, official seals, national tricolor banner).
  - Multi-role dashboards: Citizen, Government, University, Industry.
  - Interactive Leaflet maps, dynamic metrics, problem lodging modals with evidence photo upload, AI pre-screening, CSR pledge management, and real-time notifications.
- **Backend**: Node.js + Express (src/server.js) on port 5001.
- **Database**: PostgreSQL (JANSETU) with 15 normalized relational tables.
- **AI & Analytics**: 
  - Real Google Gemini API integration with robust deterministic mathematical fallback.
  - Civic Priority Matrix: Priority = 0.35 * Severity + 0.25 * Urgency + 0.20 * Population + 0.20 * Risk
  - Semantic duplicate detection using Jaccard token similarity.
  - University research challenge compatibility matching.
  - Municipal AI briefing generator for government administrators.
- **Authentication & Security**:
  - Stateless JWT without expiration claims (expiresIn omitted per specification).
  - Role-based Access Control (RBAC) middleware for citizen, government, university, and industry.
  - Passwords hashed with cryptjs.
  - Real file uploads handled via multer to uploads/.

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **PostgreSQL**: v13+ running on localhost:5432

### 2. Environment Setup
Verify your .env file in the project root:
`env
PORT=5001
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=JANSETU
DB_PASSWORD=your_postgres_password
JWT_SECRET=jansetu_production_super_secret_jwt_key_2026
ADMIN_VIEW_KEY=jansetu_admin_test_key_2026
GEMINI_API_KEY=your_gemini_key_optional
`

### 3. Database Migration & Seeding
Run migrations to build all 15 tables, indexes, and constraints:
`ash
npm run migrate
`

Seed the default accounts and sample data:
`ash
npm run seed
`

### 4. Running the Application

In root directory:
`ash
# Terminal 1: Backend Server (Port 5001)
npm start

# Terminal 2: Vite React Frontend (Port 5173)
cd frontend
npm run dev
`

Open your browser at: **http://localhost:5173**

---

## Pre-Seeded Default Accounts

All default accounts are configured with password: **JanSetu@2026**

| Role | Email | Password | Dashboard URL |
| :--- | :--- | :--- | :--- |
| **Citizen** | citizen@jansetu.gov.in | JanSetu@2026 | http://localhost:5173/citizen |
| **Government** | government@jansetu.gov.in | JanSetu@2026 | http://localhost:5173/government |
| **University** | university@jansetu.gov.in | JanSetu@2026 | http://localhost:5173/university |
| **Industry** | industry@jansetu.gov.in | JanSetu@2026 | http://localhost:5173/industry |

---

## Automated Testing

### Full Cross-Role E2E Test Suite (All 10 Scenarios)
Verifies seed logins, RBAC 403 blocks, AI pre-screening, problem lodging, government triage, challenge publishing, university match %, capstone creation, CSR pledges, and developer inspection:
`ash
npm test
`

### Authentication & Security Test Suite (All 11 Scenarios)
Verifies signup, login, role assignment, role immutability, token headers, and password validation:
`ash
npm run test:auth
`

### Frontend Production Build Test
Verifies React JSX syntax, asset bundling, and CSS integrity:
`ash
cd frontend
npm run build
`

---

## Key API Routes

### Authentication (/api/auth)
- POST /api/auth/signup - Register user (role initialized as 
ull).
- POST /api/auth/login - Authenticate with email & password.
- PUT /api/auth/role - Assign role (once assigned, role cannot be modified).
- GET /api/auth/me - Get profile of authenticated user.

### Citizen (/api/citizen)
- GET /api/citizen/stats - Personal overview counts.
- GET /api/citizen/problems - Fetch list of submitted problems.
- POST /api/citizen/ai-prescreen - AI pre-screening for priority & duplicate detection.
- POST /api/citizen/problems - Submit problem (supports multipart/form-data evidence photos).
- GET /api/citizen/problems/:id - Fetch issue timeline and officer audit remarks.

### Government (/api/government)
- GET /api/government/stats - Municipal overview metrics.
- GET /api/government/problems - Grievance stream with status & priority filters.
- PATCH /api/government/problems/:id/status - Update status, remarks, and department assignment.
- POST /api/government/challenges - Publish complex civic problem as university research challenge.
- GET /api/government/briefing - AI municipal digest & high-density issue clusters.

### University (/api/university)
- GET /api/university/stats - Active research stats.
- GET /api/university/challenges - AI-recommended research challenges with fit score.
- POST /api/university/challenges/:id/accept - Initialize capstone project.
- GET /api/university/projects - Manage ongoing research projects and milestones.

### Industry (/api/industry)
- GET /api/industry/stats - CSR budget and impact stats.
- GET /api/industry/projects - Discover university research projects seeking CSR support.
- POST /api/industry/pledge - Pledge CSR funds to a project.
- GET /api/industry/pledges - List active and approved CSR pledges.

### Developer Inspection (/api/viewdataadmin)
- GET /api/viewdataadmin - Returns complete database state across all tables.
  - Requires header X-Admin-Key: jansetu_admin_test_key_2026 or query ?key=jansetu_admin_test_key_2026.
