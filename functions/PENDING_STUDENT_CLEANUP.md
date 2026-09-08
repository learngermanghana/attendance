# Pending student cleanup

Falowen keeps unpaid trial students with `status: pending` for seven days from a stored registration/trial start timestamp.

After seven full days, a student is eligible for automatic account deletion only when all of the following are true:

- role is student (or unset)
- status is exactly `pending`
- there is no paid, partially paid, or successful payment status
- all known paid-amount fields remain zero
- a trustworthy registration/trial start timestamp exists and is at least seven days old

Deletion removes the Firestore student record, related learning records, attendance/check-in references, and the Firebase Authentication user. Google Sheet cleanup is optional and must not block core account deletion.

The class-session reminder worker runs this cleanup before resolving recipients, so an expired pending student cannot receive another live-class reminder while awaiting the scheduled cleanup cycle.
