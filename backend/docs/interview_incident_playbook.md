# Smart Interview Incident Playbook

## Scope

This playbook covers Smart Interview V2 async pipeline incidents:
- API upload ingress (`/api/v2/upload/video`)
- SQS queue + DLQ
- Interview worker
- Gemini extraction failures
- Final confirmation path

## 1) Queue Spike

### Symptoms
- `InterviewQueueDepth` increasing rapidly
- Upload responses return queue-busy errors
- Worker desired count pinned at max

### Actions
1. Confirm queue depth and worker desired/running count.
2. Scale worker service up (up to max 20).
3. Check worker logs for recurrent failures/timeouts.
4. If failures dominate, throttle ingress:
   - Set `INTERVIEW_UPLOADS_DISABLED=true` via flag service.
5. Stabilize, then re-enable uploads.

## 2) Worker Crash Loop

### Symptoms
- ECS worker tasks restarting repeatedly
- Queue depth rising with low throughput

### Actions
1. Check deployment version and recent config changes.
2. Roll back worker task definition to previous revision.
3. Validate env vars:
   - SQS URL
   - AWS credentials
   - Gemini key
4. Check stale-processing recovery kicked in (`status=processing` older than 15m reset to pending).

## 3) Gemini API Outage

### Symptoms
- `InterviewFailureCount` and `InterviewTimeoutCount` spike
- Worker errors show Gemini request failures/timeouts

### Actions
1. Verify Gemini API status externally.
2. Keep queue ingress enabled only if backlog is manageable.
3. If failure > 5%, temporarily disable uploads.
4. Retry processing from pending/failed backlog after recovery.

## 4) DLQ Filling

### Symptoms
- DLQ alarm triggered (`>5`)
- Same processing IDs repeatedly failing

### Actions
1. Inspect top DLQ payloads by error class.
2. If duplicate processing IDs in DLQ >=2, escalate severity (critical).
3. Patch and redeploy worker.
4. Redrive safe messages back to main queue in controlled batches.

## 5) API Ingress Degradation

### Symptoms
- Upload endpoint p95 > 2s sustained
- Error rate spikes (429/503/500)

### Actions
1. Check queue depth guard and daily-cost guard triggers.
2. Validate Redis/system flags are healthy.
3. Ensure MIME/size constraints are not overly aggressive for valid traffic.
4. Use API autoscaling and ALB request scaling metrics.

## 6) Rollback to V1 Plan

Use rollback only when v2 pipeline cannot meet SLA:
1. Keep v2 endpoint online but soft-disable for new uploads.
2. Route mobile fallback to v1 upload endpoint (release toggle).
3. Drain current v2 queue safely.
4. Open incident retrospective and remediation timeline.

## 7) Post-Incident Checklist

1. Document incident timeline and correlation IDs.
2. Capture root cause and contributing factors.
3. Add guardrails/tests for recurrence.
4. Update this playbook and runbook dashboards.
