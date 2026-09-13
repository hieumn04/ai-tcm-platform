# Backend Documentation - TCM Platform

RESTful API and AI Engine built with Node.js, Express, and PostgreSQL for the TCM (Test Case Management) platform.

---

## Architecture Overview

The backend uses a structured MVC + Service Layer pattern:

- **Controllers** (`src/controllers/`): Handles HTTP requests, validations, and response formatting.
- **Services** (`src/services/`): Core business logic, third-party integrations (DeepSeek AI LLM service, WebSocket server).
- **Models** (`src/models/`): Sequelize ORM schema definitions, relations, and data types (including `JSONB` for AI analysis persistence).
- **Routes** (`src/routes/`): Modular API routing organized by resource domains (`/api/ai`, `/api/cases`, `/api/runs`, `/api/projects`, `/api/users`).
- **Middlewares** (`src/middlewares/`): JWT verification, RBAC permissions, request validators, and error handling.

---

## Folder Structure

```
backend/
├── src/
│   ├── app.js                    # Express app initialization & middleware registration
│   ├── server.js                 # HTTP & WebSocket server launcher
│   ├── config/                   # Sequelize database connection config
│   ├── controllers/
│   │   ├── ai.controller.js      # DeepSeek AI test execution & assessment persistence
│   │   ├── cases.controller.js   # Test case CRUD & multi-step editing
│   │   ├── runs.controller.js    # Test run execution cycles & case assignment
│   │   └── ...                   # Project, User, Attachment, Folder controllers
│   ├── services/
│   │   ├── deepseek.service.js   # DeepSeek LLM prompts, bilingual parser & security scanner
│   │   └── websocket.service.js  # Real-time WebSocket broadcasting
│   ├── models/                   # Sequelize schemas (Case, Run, RunCase, User, Step...)
│   ├── routes/                   # Route groups mapped to REST endpoints
│   ├── middlewares/              # JWT auth and RBAC guards
│   └── utils/                    # Common response formatting helpers
├── migrations/                   # Sequelize database schema migrations
├── seeders/                      # Sample users, projects, and test cases
└── scripts/                      # DB migration & maintenance utility scripts
```

---

## Tech Stack & Dependencies

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 16
- **ORM**: Sequelize v6
- **AI Integration**: DeepSeek V4 (`deepseek-v4-pro` for deep vulnerability scanning & `deepseek-flash` for high-throughput test generation)
- **Security & Auth**: JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`
- **Real-Time**: `socket.io`

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=8001
NODE_ENV=development

# Database Settings
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tcm_db
DB_HOST=localhost
DB_PORT=5432

# DeepSeek V4 AI Integration (deepseek-v4-pro / deepseek-flash)
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

# Security
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
```

---

## Getting Started

### 1. Start PostgreSQL (Docker)
```bash
# From the repository root
docker-compose up -d postgres
```

### 2. Install & Setup Database
```bash
cd backend
yarn install

# Run database migrations (creates all tables including aiAssessment column)
yarn migrate

# (Optional) Seed sample data
yarn seed
```

### 3. Start the Server
```bash
# Development mode with hot-reloading (port 8001)
yarn dev

# Production mode
yarn start
```

API will be available at: **http://localhost:8001**

---

## Key API Endpoints

### DeepSeek AI Services
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/execute-case` | Runs DeepSeek review to detect race conditions, security vulnerabilities, and generates bilingual synthetic test sets. Auto-saves to Database. |
| `POST` | `/api/ai/save-assessment` | Explicitly saves an AI assessment payload to a Case or RunCase in PostgreSQL. |

### Test Case Management
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cases/:caseId` | Retrieve single test case details including `aiAssessment` and step sequence. |
| `POST` | `/api/cases/new` | Create a new test case. |
| `PUT` | `/api/cases/:caseId` | Update case metadata, steps, priority, and preconditions. |
| `DELETE` | `/api/cases/:caseId` | Soft delete test case. |

### Test Runs & Execution
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/runs/:projectId` | Fetch all test runs for a project. |
| `POST` | `/api/runs/new` | Create a new execution cycle. |
| `POST` | `/api/runs/add-cases` | Batch add test cases into an active run. |
| `PUT` | `/api/run-cases/:runCaseId/status` | Update execution result (`passed`, `failed`, `pending`). |

---

## Coding Conventions

- **File names**: `kebab-case.js` (e.g., `ai.controller.js`, `deepseek.service.js`)
- **Controller methods**: `camelCase` (e.g., `executeCase()`, `saveAssessment()`)
- **Models**: `PascalCase.js` (e.g., `Case.js`, `RunCase.js`)
- **Route prefixes**: RESTful paths prefixed with `/api`
