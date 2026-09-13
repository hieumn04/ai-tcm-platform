# Frontend Documentation - TCM Platform

Next.js 14 (App Router) + TypeScript + NextUI application for the TCM (Test Case Management) platform.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **UI Components**: NextUI (v2), Tailwind CSS
- **Icons**: Lucide React (Clean, modern tech SVG icons)
- **State & Guarding**: React Context, custom `useFormGuard`
- **Charts & Data Viz**: ApexCharts, Chart.js
- **Localization**: next-intl (Bilingual support)
- **Data Import/Export**: `xlsx` (Excel sheets)

---

## Project Structure

```
frontend/
├── src/app/[locale]/
│   ├── layout.tsx                              # Root layout with NextUI and Theme providers
│   ├── page.tsx                                # Landing page
│   ├── HeaderNavbarMenu.tsx                    # Top navigation bar with TCM tech branding
│   ├── account/                                # Authentication (signin / signup)
│   ├── admin/                                  # Administrative panel & member management
│   └── projects/
│       ├── page.tsx                            # Project grid & list
│       └── [projectId]/
│           ├── layout.tsx                      # Project workspace layout with sidebar
│           ├── home/                           # Metrics dashboard (pass/fail ratios, velocity)
│           ├── folders/[folderId]/cases/
│           │   ├── page.tsx                    # Test suite tree & case list
│           │   ├── CasesPane.tsx               # Folder explorer & test case table
│           │   ├── TestCaseTable.tsx           # Paginated test case grid with quick AI actions
│           │   ├── AiAnalysisModal.tsx         # Bilingual AI assessment & synthetic data modal
│           │   ├── AddTestCasesIntoRunDialog.tsx # Real-time Run assignment dialog
│           │   └── [caseId]/
│           │       └── CaseEditor.tsx          # Multi-step editor with AI Vulnerability Review
│           ├── runs/                           # Test run execution cycles
│           ├── members/                        # Team assignments & roles
│           └── settings/                       # Project configuration
├── components/                                 # Reusable widgets, modals, and avatar badges
├── config/                                     # API endpoints & environment constants
└── utils/                                      # API controllers (aiControl, caseControl, runControl)
```

---

## Core Frontend Highlights

### 1. AI Edge-Case & Vulnerability Review
- Located in `CaseEditor.tsx` next to the `Save` button.
- When clicked, sends the current in-memory test case specification to DeepSeek AI to identify race conditions, concurrency traps, and security vulnerabilities (XSS, SQL Injection).
- Displays findings and synthetic test datasets inside `AiAnalysisModal.tsx`.

### 2. Instant 0-Token Bilingual Switching
- Inside `AiAnalysisModal.tsx`, users can instantly toggle between Vietnamese and English.
- Since the DeepSeek backend prompt generates structured bilingual content in a single round-trip, language switching occurs in 0ms with zero extra token consumption.

### 3. Real-Time Test Run Selection
- In `AddTestCasesIntoRunDialog.tsx`, test runs refresh automatically upon dialog open, listen for window focus events (when switching between browser tabs), and include a manual spinning refresh button.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn or npm

### Setup & Run
```bash
cd frontend

# Install dependencies
yarn install

# Copy environment file
cp .env.example .env.local

# Start development server on port 8000
yarn dev
```

Visit: **http://localhost:8000**

---

## Environment Configuration

In `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8001
```

In `frontend/config/config.ts`:
```typescript
// Local development connects directly to backend port 8001:
apiServer: 'http://localhost:8001/api',
```

---

## Available Scripts

```bash
yarn dev        # Start development server on http://localhost:8000
yarn build      # Build production bundle
yarn start      # Start production server
yarn lint       # Run ESLint checking
```

---

## Design & UI Standards
- **Icons**: Clean and minimalistic SVG icons from `lucide-react`.
- **Theme**: Dark/Light mode compatible with NextUI CSS variables.
- **Micro-interactions**: Subtle loading animations, pulse effects on AI review buttons, and color-coded status chips (Passed, Failed, Pending).
