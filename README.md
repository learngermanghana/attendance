# Attendance App (Firebase + React)

Attendance management app for teachers with two capture modes:
- Manual attendance marking in the dashboard.
- Student self check-in via QR with email + phone validation through Firebase Cloud Functions.

## Architecture

- Frontend: React + Vite (`src/`)
- Backend API: Firebase Cloud Functions v2 (`functions/index.js`)
- Database: Firestore
- Auth: Firebase Authentication (teacher login)

## Data Model

Canonical attendance path:

- `attendance/{classId}/sessions/{date}`
  - Session fields: `classId`, `date`, `records[]`, `opened`, `openFrom`, `openTo`, `createdAt`, `updatedAt`.
  - `checkins/{studentUid}` subcollection for QR submissions.

Supporting collections:

- `classes/{classId}` (recommended):
  - `name`, `classId` (optional if using doc id)
- `students/{studentId}`:
  - `name`, `email`, `role`, `status`, `studentCode`, `classId`

## Frontend Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_OPEN_SESSION_API_URL=https://<region>-<project>.cloudfunctions.net/api/openSession
VITE_CHECKIN_API_URL=https://<region>-<project>.cloudfunctions.net/api/checkin
VITE_STUDENTS_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/<published-sheet-id>/pub?output=csv
VITE_MARKING_ROSTER_CSV_URL=https://docs.google.com/spreadsheets/d/<sheet-id>/gviz/tq?tqx=out:csv&sheet=Students
VITE_SCORES_WEBHOOK_URL=https://script.google.com/macros/s/<deployment-id>/exec
VITE_ENABLE_SCORE_FIRESTORE=false
```

3. Run locally:

```bash
npm run dev
```

## Functions Setup

1. Install dependencies:

```bash
cd functions
npm install
```

2. Set required runtime config:

```bash
firebase functions:config:set attendance.pin_salt="<long-random-secret>"
firebase functions:config:set attendance.teacher_emails="teacher1@example.com,teacher2@example.com"
```

3. Deploy:

```bash
firebase deploy --only functions
```

## Operational Flow

1. Teacher signs in and opens a class attendance page.
2. Teacher opens check-in to generate a QR URL.
3. Student scans QR (`/checkin?classId=...&date=...`) and submits email + phone number.
4. Function validates session window, student record match, and class membership, then writes check-in with an auto-generated secret code.
5. Teacher can save manual attendance records and run reports with CSV export.

## Reports

Reports page supports:
- Filter by class id and date range.
- Status filter (present/absent/late/excused).
- Aggregate metrics.
- CSV export of filtered rows.

## Notes

- `createdAt` fields are only set on first write; subsequent writes only update `updatedAt`.
- The app still accepts legacy `className` values in API/query params for migration compatibility, but `classId` is the canonical term.

## Marking Console

The app includes a **Mark Work** page with a 5-stage marking workflow:
1. Pick a student from roster CSV (Google Sheet with local `public/students.csv` fallback).
2. Pick a reference answer from `src/data/answers_dictionary.json`.
3. Load the student submission from Firestore (`submissions` + legacy nested fallbacks).
4. Enter manual score/feedback.
5. Save to Google Sheets webhook, with optional Firestore mirror into `scores`.

The target score row schema is: `studentcode, name, assignment, score, comments, date, level, link`.
