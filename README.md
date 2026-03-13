# Falowen Dashboard (Firebase + React)

Attendance management app for teachers with two capture modes:
- Manual attendance marking in the dashboard.
- Student self check-in via QR with email + phone validation through Firebase Cloud Functions.

## Architecture

- Frontend: React + Vite (`src/`)
- Backend API: Firebase Cloud Functions v2 (`functions/index.js`)
- Database: Firestore
- Auth: Firebase Authentication (teacher login)

## Data Model Structure

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
VITE_SCORES_WEBHOOK_TOKEN=<optional-token-configured-in-app-script>
VITE_SCORES_WEBHOOK_SHEET_NAME=<optional-target-sheet-name>
VITE_SCORES_WEBHOOK_SHEET_GID=<optional-target-sheet-gid>
VITE_ENABLE_SCORE_FIRESTORE=false
VITE_ANNOUNCEMENT_WEBHOOK_URL=https://script.google.com/macros/s/<deployment-id>/exec
VITE_ANNOUNCEMENT_WEBHOOK_TOKEN=<optional-token-configured-in-app-script>
VITE_ANNOUNCEMENT_WEBHOOK_SHEET_NAME=<optional-target-sheet-name>
VITE_ANNOUNCEMENT_WEBHOOK_SHEET_GID=<optional-target-sheet-gid>
VITE_ENABLE_ANNOUNCEMENT_FIRESTORE=false
VITE_SOCIAL_WEBHOOK_URL=https://script.google.com/macros/s/<deployment-id>/exec
VITE_SOCIAL_WEBHOOK_TOKEN=<optional-token-configured-in-app-script>
VITE_SOCIAL_WEBHOOK_SHEET_NAME=<optional-target-sheet-name>
VITE_SOCIAL_WEBHOOK_SHEET_GID=<optional-target-sheet-gid>
```

3. Run locally:

```bash
npm run dev
```


## Firestore Indexes

Firestore creates single-field indexes automatically, but **composite indexes must be defined and deployed**.

This repo is now configured so Firebase reads `firestore.indexes.json` from `firebase.json`.

Create/update indexes automatically in your project by deploying them:

```bash
firebase deploy --only firestore:indexes
```

Tip: when a query needs a new composite index, Firestore returns an error with a direct "Create index" link.
Use that link once, then run `firebase firestore:indexes > firestore.indexes.json` (or copy from console) to keep the file in sync.

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
4. Function validates check-in window, student record match, and class membership, then writes check-in with an auto-generated secret code.
5. Teacher can save manual attendance records, mark student work, and send broadcast announcements to Google Sheets.

## Product Backlog Notes

- Self check-in improvement ideas: `docs/self-checkin-updates.md`.

## Notes

- `createdAt` fields are only set on first write; subsequent writes only update `updatedAt`.
- The app still accepts legacy `className` values in API/query params for migration compatibility, but `classId` is the canonical term.

## Marking Console

The app includes a **Mark Work** page with a 5-stage marking workflow:
1. Pick a student from roster CSV (Google Sheet with local `public/students.csv` fallback).
2. Pick a reference answer from `src/data/answers_dictionary.json`.
3. Load the student submission from Firestore (`submissions` + legacy nested fallbacks).
4. Auto-mark draft (optional) or enter manual score/feedback.
5. Save to Google Sheets webhook, with optional Firestore mirror into `scores`.

For objective answers, auto-mark accepts either the option letter (`B`) or the answer text (`Um sieben Uhr`) when matching entries such as `B) Um sieben Uhr`.

The target score row schema is: `studentcode, name, assignment, score, comments, date, level, link`.
If your Apps Script expects auth/sheet selectors, configure `VITE_SCORES_WEBHOOK_TOKEN`, `VITE_SCORES_WEBHOOK_SHEET_NAME`, and/or `VITE_SCORES_WEBHOOK_SHEET_GID`.

### Set up the marking sheet (auto-send scores)

Use this once so clicking **Save score** in the Marking page writes directly into Google Sheets.

1. **Create a Google Sheet** for marking results.
2. In row 1, add exact headers (in order recommended):

   ```
   studentcode,name,assignment,score,comments,date,level,link
   ```

3. Open **Extensions → Apps Script** and paste this web-app handler:

   ```javascript
   function doPost(e) {
     try {
       const body = JSON.parse(e.postData.contents || "{}");
       const token = "REPLACE_WITH_OPTIONAL_SHARED_TOKEN"; // Set "" to disable token check.

       if (token && body.token !== token) {
         return ContentService.createTextOutput(
           JSON.stringify({ ok: false, error: "Unauthorized" })
         ).setMimeType(ContentService.MimeType.JSON);
       }

       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = body.sheet_gid
         ? ss.getSheets().find((s) => String(s.getSheetId()) === String(body.sheet_gid))
         : (body.sheet_name ? ss.getSheetByName(body.sheet_name) : ss.getActiveSheet());

       if (!sheet) {
         return ContentService.createTextOutput(
           JSON.stringify({ ok: false, error: "Target sheet not found" })
         ).setMimeType(ContentService.MimeType.JSON);
       }

       const rows = Array.isArray(body.rows)
         ? body.rows
         : (body.row ? [body.row] : []);

       if (!rows.length) {
         return ContentService.createTextOutput(
           JSON.stringify({ ok: false, error: "No row payload" })
         ).setMimeType(ContentService.MimeType.JSON);
       }

       rows.forEach((r) => {
         sheet.appendRow([
           r.studentcode || "",
           r.name || "",
           r.assignment || "",
           r.score ?? "",
           r.comments || "",
           r.date || new Date().toString(),
           r.level || "",
           r.link || "",
         ]);
       });

       return ContentService.createTextOutput(
         JSON.stringify({ ok: true, count: rows.length })
       ).setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService.createTextOutput(
         JSON.stringify({ ok: false, error: String(err) })
       ).setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```

4. **Deploy** the script as a Web App:
   - Deploy → New deployment → Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone** (or anyone in your domain)
   - Copy the `/exec` URL.

5. Add/update the frontend env values:

   ```bash
   VITE_SCORES_WEBHOOK_URL=https://script.google.com/macros/s/<deployment-id>/exec
   VITE_SCORES_WEBHOOK_TOKEN=REPLACE_WITH_OPTIONAL_SHARED_TOKEN
   VITE_SCORES_WEBHOOK_SHEET_NAME=Scores
   # or
   VITE_SCORES_WEBHOOK_SHEET_GID=123456789
   ```

6. Restart the frontend (`npm run dev`), open **Mark Work**, and click **Save score**.

### Auto-send troubleshooting

- If save shows success but row is missing, verify the deployed Apps Script version and sheet selector (`sheet_name`/`sheet_gid`).
- If you get unauthorized/validation errors, confirm `VITE_SCORES_WEBHOOK_TOKEN` matches the token in Apps Script.
- If your browser blocks CORS for script responses, the app falls back to a `no-cors` request, so check the target sheet directly.

## Communication Broadcasts

The app includes a **Communication** page for tutor broadcasts that writes directly into an announcement Google Sheet.

The target row schema is:
`announcement, class, date, link, topic, email, attach_certificate, cert_level`.

Use quick templates for common messages:
- Class about to start
- Class cancellation
- Course ended / transcript or certificate notice

### Set up the announcement sheet (auto-send broadcasts)

Use this once so clicking **Save broadcast** in the Communication page writes directly into Google Sheets.

1. **Create a Google Sheet** for announcements.
2. In row 1, add exact headers:

   ```
   announcement,class,date,link,topic,email,attach_certificate,cert_level
   ```

3. Open **Extensions → Apps Script** and paste this web-app handler:

   ```javascript
   function doPost(e) {
     try {
       const body = JSON.parse(e.postData.contents || "{}");
       const token = "REPLACE_WITH_OPTIONAL_SHARED_TOKEN"; // Set "" to disable token check.

       if (token && body.token !== token) {
         return ContentService.createTextOutput(
           JSON.stringify({ ok: false, error: "Unauthorized" })
         ).setMimeType(ContentService.MimeType.JSON);
       }

       const ss = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = body.sheet_gid
         ? ss.getSheets().find((s) => String(s.getSheetId()) === String(body.sheet_gid))
         : (body.sheet_name ? ss.getSheetByName(body.sheet_name) : ss.getActiveSheet());

       if (!sheet) {
         return ContentService.createTextOutput(
           JSON.stringify({ ok: false, error: "Target sheet not found" })
         ).setMimeType(ContentService.MimeType.JSON);
       }

       const rows = Array.isArray(body.rows)
         ? body.rows
         : (body.row ? [body.row] : []);

       if (!rows.length) {
         return ContentService.createTextOutput(
           JSON.stringify({ ok: false, error: "No row payload" })
         ).setMimeType(ContentService.MimeType.JSON);
       }

       rows.forEach((r) => {
         sheet.appendRow([
           r.announcement || "",
           r.class || "",
           r.date || new Date().toISOString().slice(0, 10),
           r.link || "",
           r.topic || "",
           r.email || "",
           r.attach_certificate || "FALSE",
           r.cert_level || "",
         ]);
       });

       return ContentService.createTextOutput(
         JSON.stringify({ ok: true, count: rows.length })
       ).setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService.createTextOutput(
         JSON.stringify({ ok: false, error: String(err) })
       ).setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```

4. **Deploy** the script as a Web App:
   - Deploy → New deployment → Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone** (or anyone in your domain)
   - Copy the `/exec` URL.

5. Add/update frontend env values:

   ```bash
   VITE_ANNOUNCEMENT_WEBHOOK_URL=https://script.google.com/macros/s/<deployment-id>/exec
   VITE_ANNOUNCEMENT_WEBHOOK_TOKEN=REPLACE_WITH_OPTIONAL_SHARED_TOKEN
   VITE_ANNOUNCEMENT_WEBHOOK_SHEET_NAME=Announcements
   # or
   VITE_ANNOUNCEMENT_WEBHOOK_SHEET_GID=123456789
   ```

6. Restart frontend and open **Communication** to send broadcasts.


## Social Media Tracker Save Flow

The **Social Post Tracker** page now saves new social rows directly to a Google Sheets webhook.

1. In your target sheet, create header columns (row 1):

   ```
   date,brand,platform,content_type,topic,format,account,time,likes,comments,shares,reach,created_at
   ```

2. Open **Extensions → Apps Script**, paste the code from `docs/social-media-webhook.gs`, and deploy it as a **Web app**.
3. Put the deployment `/exec` URL in `VITE_SOCIAL_WEBHOOK_URL`.
4. If you configured token/sheet selectors in Apps Script, add:

   ```bash
   VITE_SOCIAL_WEBHOOK_TOKEN=REPLACE_WITH_OPTIONAL_SHARED_TOKEN
   VITE_SOCIAL_WEBHOOK_SHEET_NAME=Post_Tracker
   # or
   VITE_SOCIAL_WEBHOOK_SHEET_GID=123456789
   ```

5. Restart `npm run dev` and use **Social Post Tracker → Save to Google Sheet**.
