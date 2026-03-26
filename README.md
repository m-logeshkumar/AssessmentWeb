# AssessmentWeb

AssessmentWeb is a full-stack assessment platform for colleges/training teams.
It supports role-based access for admins and students, timed tests, autosave, score evaluation, and leaderboard views.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, React Hot Toast
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Auth: JWT-based authentication
- Optional AI evaluation: Gemini API

## Project Structure

```
AssessmentWeb/
	src/                     # React frontend
	backend/                 # Express API + MongoDB models/controllers
	public/                  # Static assets
	render.yaml              # Render deployment config
```

## Core Modules

- Authentication
	- Student self-registration
	- Login for authenticated users
	- JWT token-based session handling
- Admin
	- Create and manage assessments
	- Start/stop assessments
	- Review submissions and evaluate results
	- Manage students
- Student
	- View active/available tests
	- Attempt timed fill-up tests
	- Autosave progress and submit answers
	- View score dashboard and scorecard
- Shared
	- Leaderboard for performance visibility

## End-to-End Flow

### 1. Authentication Flow

1. New students register through the register page.
2. Users log in and receive a JWT token.
3. The frontend stores auth details in local storage.
4. Protected routes redirect users based on role:
	 - Admin -> assessment management
	 - Student -> score dashboard/tests

### 2. Admin Assessment Flow

1. Admin creates an assessment with title, duration, and questions.
2. Assessment is started manually by admin.
3. Students can attempt only while status is active.
4. Admin can stop the assessment, which marks it completed.
5. Admin evaluates results either:
	 - Manually (publish with correct answers)
	 - Using AI evaluation (Gemini, if configured)
6. Final scores are saved and visible to students.

### 3. Student Test Flow

1. Student opens available tests.
2. On test start:
	 - Student-specific timer starts.
	 - Existing autosaved answers are loaded if available.
3. Answers autosave at intervals during the test.
4. Student submits manually, or submission is handled at timeout.
5. Student views score dashboard and scorecard after evaluation.

## API Overview

Backend routes are mounted under `/api`:

- `/api/auth` -> register, login, profile, student management
- `/api/assessments` -> create/list/start/stop/publish/evaluate
- `/api/submissions` -> start attempt, autosave, submit, fetch attempts
- `/api/scores` -> score/leaderboard related endpoints
- `/api/hackerrank` -> HackerRank-related score operations

Health check endpoint:

- `GET /api/health`

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)

### 1. Install dependencies

From project root:

```bash
npm install
```

### 2. Configure backend environment

Create `backend/.env` with:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key_optional
```

### 3. Configure frontend environment (optional)

Create `.env` in project root (if needed):

```env
VITE_API_URL=http://localhost:5000/api
```

If not provided, the app can fall back to the default API URL configured in the frontend context.

### 4. Run in development

```bash
npm run dev:full
```

This starts:

- Frontend (Vite) on default dev port
- Backend server with nodemon

## Available Scripts

Root scripts:

- `npm run dev` -> start frontend only
- `npm run server` -> start backend only
- `npm run dev:full` -> start frontend + backend concurrently
- `npm run build` -> production build
- `npm run preview` -> preview build output
- `npm run lint` -> run ESLint

Backend scripts (inside `backend/`):

- `npm run dev` -> start backend with nodemon
- `npm start` -> start backend with node

## Notes

- Do not commit `.env` files.
- Admin accounts are managed separately from student self-registration.
- AI evaluation requires a valid Gemini API key; otherwise use manual result publishing.
