# Self Check-in: Suggested Updates

This is a practical backlog for improving the current QR-based self check-in flow.

## 1) Quick wins (high impact, low effort)

1. **Show submit success state in-page (not toast only).**
   - Keep a visible confirmation card after successful check-in: time submitted, masked email, and session info.
   - Helps when students miss transient toast notifications.

2. **Add duplicate-submission protection on UI and API.**
   - Frontend: disable submit after success.
   - Backend: idempotency by `(classId, sessionId, studentUid)` or email+studentCode pair, returning “already checked in” instead of creating duplicates.

3. **Add clearer field-level validation hints.**
   - Email format hint and phone/student number constraints before submit.
   - Replace generic error with exact instruction for each field.

4. **Auto-focus first invalid field.**
   - Improves mobile speed during classroom use.

5. **Add countdown/status for check-in window.**
   - Display “Open now / Opens at / Closed at” based on session window from backend.

## 2) Reliability & anti-fraud updates

1. **Bind check-in links to signed token + expiry.**
   - Generate signed short-lived token in QR payload.
   - API verifies signature and expiration to prevent replay of old screenshots.

2. **Device rate limiting and abuse controls.**
   - Throttle repeated submissions per IP/device fingerprint within short intervals.

3. **Geo/time anomaly flags (optional, non-blocking).**
   - Flag suspicious submissions (e.g., large time drift, impossible rapid repeats).

4. **Audit fields for teacher review.**
   - Save `submittedAt`, `source` (`qr` vs direct link), and `attemptCount` for incident review.

## 3) Teacher workflow improvements

1. **Live roster view with “just checked in” stream.**
   - Real-time table showing latest check-ins with search and missing-student count.

2. **One-click reminders for absent students.**
   - Generate reminder list from roster minus check-ins.

3. **Late check-in policy toggles.**
   - Settings for `on-time`, `late`, and `closed` labels based on configurable grace period.

4. **Session-level template presets.**
   - Save default check-in duration and rules per class to reduce repeated setup.

## 4) Student UX updates

1. **“Remember me” mode (local-only).**
   - Prefill last successful email/student number from browser local storage.

2. **Localization and plain-language labels.**
   - Friendly wording for multilingual classrooms.

3. **Accessibility pass.**
   - Improve focus indicators, label association, and error announcement (`aria-live`).

4. **Network resilience.**
   - Friendly retry with preserved form state when API is temporarily unavailable.

## 5) Data quality and reporting

1. **Normalize and store canonical student identifier separately.**
   - Keep raw input plus normalized student code to simplify matching and audits.

2. **Add check-in reason/status dimensions.**
   - Example: `on_time`, `late`, `manual_override`, `duplicate_blocked`.

3. **Export-ready attendance summary.**
   - Daily CSV export with totals and unresolved mismatches.

## Suggested implementation order

1. Quick wins (validation, duplicate handling, submit success state).
2. Signed QR tokens + expiry.
3. Teacher real-time review dashboard enhancements.
4. Accessibility + localization pass.
5. Reporting/export improvements.

## Success metrics to track

- Duplicate check-in rate.
- Average time-to-check-in per student.
- % of failed submissions and top error reasons.
- Teacher corrections required per session.
- Late check-in percentage by class.
