# TCM - AI-First Test Case Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![DeepSeek AI](https://img.shields.io/badge/DeepSeek%20AI-V4%20(Pro%20%2F%20Flash)-purple?style=flat-square)](https://deepseek.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

An enterprise-grade Test Case Management (TCM) and Quality Engineering Platform built for agile engineering teams and AI-first development workflows. TCM integrates DeepSeek V4 to automatically detect software vulnerabilities, race conditions, edge cases, and generate synthetic test datasets directly from test specifications.

---

## 🌐 Live Demo & Test Credentials

The platform is deployed and live for testing:

- **Frontend Web App**: [https://ai-tcm-platform-weld.vercel.app](https://ai-tcm-platform-weld.vercel.app)
- **Backend REST API**: [https://ai-tcm-platform-production.up.railway.app](https://ai-tcm-platform-production.up.railway.app)

🔑 **Demo Accounts for Recruiters & Reviewers:**

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| 👑 **Admin / Lead QA** | `admin@example.com` | `password` | Full administrative access & project management |
| 🧪 **QA Tester 1** | `samuel@example.com` | `password` | Test execution, AI analysis & reporting |
| 🧪 **QA Tester 2** | `zoe@example.com` | `password` | Real-time multi-user collaboration testing |

> 💡 *Note: All demo accounts use the default password `password`.*

---

## Key Highlights & Features

### 1. AI Edge-Case & Vulnerability Detector (DeepSeek V4 Engine)
Powered by a dual-model architecture tailored for precision quality engineering:
- **`deepseek-v4-pro`**: Advanced reasoning model specialized in architectural vulnerability scanning, race conditions, idempotency traps, and complex concurrency validation.
- **`deepseek-flash`**: High-throughput, sub-second latency model for rapid test case generation, test suite structuring, and synthetic test dataset synthesis.

- **Shift-Left Security & QA Review**: Built directly into the test case editor. Reviews specifications to catch defects that traditional testing and code generation tools commonly overlook:
  - **Concurrency & Race Conditions**: Detects duplicate submissions, simultaneous requests, and missing idempotency tokens.
  - **Security Vulnerabilities**: Identifies lack of validation for SQL Injection, Cross-Site Scripting (XSS), CSRF, and authorization flaws.
  - **Boundary & Negative Cases**: Flags missing limits (unicode characters, empty payloads, negative numbers, extreme values).
- **Synthetic Test Data Generation**: Automatically provides 4 structured scenarios with ready-to-use input datasets:
  1. Positive / Happy Path
  2. Boundary & Negative Cases
  3. Concurrency & Race Conditions
  4. Security & Vulnerability Payloads
- **Instant 0-Token Bilingual Switching**: Single-prompt bilingual generation allowing users to switch between Vietnamese and English in real time with zero extra API latency or token cost.
- **PostgreSQL Persistence**: All AI reviews and synthetic test sets are saved directly into the PostgreSQL database (`aiAssessment` JSONB), preventing redundant API consumption.

### 2. Comprehensive Test Management
- **Hierarchical Organization**: Organize test suites and test cases into nested folders with drag-and-drop support.
- **Rich Test Case Editor**: Multi-step action/result editors, precondition definitions, custom IDs (`TC-AI-01`), priorities (`P0`-`P3`), and execution templates.
- **Test Runs & Execution Cycles**: Select cases into runs, execute manual or AI-assisted test rounds, assign dev roles (`App`, `Backend`, `Frontend`), and track live completion status (`Passed`, `Failed`, `Pending`).
- **Platform Evidence**: Attach logs, screenshots, and platform execution evidence directly to test runs.
- **Import / Export**: Full spreadsheet interoperability with Excel (.xlsx) import and export capabilities.

### 3. Analytics & Audit Trail
- **Live Metrics Dashboard**: Visual progress tracking with interactive Chart.js and ApexCharts components.
- **Complete Audit Trail**: Automated Change Log tracking who modified what step, when, and why.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admins, Project Managers, Developers, and Reporters.

---

## Architecture & Monorepo Structure

```
.
├── frontend/               # Next.js 14 App Router, TypeScript, NextUI, Tailwind CSS
│   ├── src/app/[locale]/   # Localized pages (Projects, Runs, Cases, Dashboard)
│   ├── components/         # Reusable UI components & dialogs
│   ├── config/             # API server endpoints & constants
│   └── utils/              # Client API controllers & WebSocket service
│
├── backend/                # Node.js, Express, Sequelize ORM, PostgreSQL
│   ├── src/
│   │   ├── controllers/    # Business logic (AI, Cases, Runs, Users, Projects)
│   │   ├── services/       # DeepSeek AI service & WebSocket server
│   │   ├── models/         # Sequelize database schemas & associations
│   │   ├── routes/         # RESTful API route definitions
│   │   └── middlewares/    # JWT Auth, RBAC guards, rate-limiting
│   ├── migrations/         # PostgreSQL schema migrations
│   └── seeders/            # Initial demo datasets & sample test runs
│
└── docs/                   # Docusaurus-based developer & user documentation
```

---

## Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, NextUI, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express.js, Sequelize ORM, Socket.IO |
| **Database** | PostgreSQL 16 (Dockerized or Native) |
| **AI Engine** | DeepSeek V4 (`deepseek-v4-pro`, `deepseek-flash`) |
| **Data Viz** | ApexCharts, Chart.js |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt password hashing |

---

## Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- Yarn or npm
- Docker & Docker Compose (recommended for PostgreSQL)

---

### Step 1: Clone and Configure Environment

```bash
# Clone the repository
git clone https://github.com/hieumn04/ai-tcm-platform.git
cd ai-tcm-platform

# Setup Backend Environment
cp backend/.env.example backend/.env

# Setup Frontend Environment
cp frontend/.env.example frontend/.env.local
```

Configure your `backend/.env`:
```env
PORT=8001
NODE_ENV=development

# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tcm_db
DB_HOST=localhost
DB_PORT=5432

# DeepSeek V4 AI (deepseek-v4-pro for deep review, deepseek-flash for fast generation)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

# JWT Secret
JWT_SECRET=your_jwt_super_secret_key
```

---

### Step 2: Start PostgreSQL Database

```bash
# Start PostgreSQL via Docker Compose
docker-compose up -d postgres
```

---

### Step 3: Start the Backend API (Terminal 1)

```bash
cd backend
yarn install
yarn migrate      # Run database migrations
yarn seed         # (Optional) Seed sample data
yarn dev          # Starts server on http://localhost:8001
```

---

### Step 4: Start the Frontend UI (Terminal 2)

```bash
cd frontend
yarn install
yarn dev          # Starts Next.js app on http://localhost:8000
```

Open your browser at **http://localhost:8000** to access the platform.

---

## Key AI & Core Endpoints

| Area | Method | Endpoint | Description |
|---|---|---|---|
| **AI** | `POST` | `/api/ai/execute-case` | Run DeepSeek V4 Edge-Case & Vulnerability Review |
| **AI** | `POST` | `/api/ai/save-assessment` | Persist AI assessment directly to Database |
| **Cases** | `GET` | `/api/cases/:caseId` | Retrieve full test case with AI assessments |
| **Cases** | `PUT` | `/api/cases/:caseId` | Update test case steps, preconditions, metadata |
| **Runs** | `GET` | `/api/runs/:projectId` | Fetch test runs with live pass/fail status |
| **Runs** | `POST` | `/api/runs/new` | Create execution cycle and assign cases |

---

## Code Style & Git Conventions

- **Formatting**: Run `yarn format` from the root folder before committing.
- **Frontend Linting**: Run `cd frontend && yarn lint` to ensure zero ESLint/TypeScript errors.
- **Naming Conventions**:
  - React Components: `PascalCase.tsx`
  - Backend Controllers & Routes: `kebab-case.js`
  - Database Models: `PascalCase.js`

---

## License

This project is licensed under the [MIT License](./LICENSE).
