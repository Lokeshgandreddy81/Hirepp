# Smart Interview V2 Migration Finalizer Checklist

Use this checklist before deprecating `POST /api/upload/video` (v1).

## Required Conditions (must all pass)

1. `v1_upload_count == 0` for rolling 30 days.
2. `v2` failure rate `< 2%` over rolling 7 days.
3. DLQ rate `< 0.1%` over rolling 7 days.
4. `ConfirmCompletionRate > 85%` over rolling 7 days.

## Validation Queries (CloudWatch / Logs Insights)

1. `v1_upload_count` trend:
   - Filter metric `v1_upload_count` for last 30 days.
2. `v2` failure rate:
   - `InterviewFailureCount / InterviewDailyCount`.
3. DLQ rate:
   - `ApproximateNumberOfMessagesVisible` on `interview-processing-dlq`.
4. Confirm completion:
   - `ConfirmCompletionRate` metric p50 and average.

## Cutover Steps

1. Announce freeze window and monitor staffing.
2. Mark v1 route deprecated in API docs + response header.
3. Keep v1 route enabled but warn for 7 days.
4. Remove v1 client usage (verify app versions).
5. Disable v1 route.
6. Keep rollback playbook ready for 24 hours.

## Rollback Trigger

Rollback to v1 if any of the following occurs after cutover:

1. `InterviewFailureCount` spikes above 5% for 15 minutes.
2. DLQ visible messages exceed 50.
3. API latency p95 for upload endpoint exceeds 3 seconds sustained.
