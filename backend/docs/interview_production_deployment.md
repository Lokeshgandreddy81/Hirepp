# Smart Interview V2 Production Deployment Guide

## ECS Service Split (Mandatory)

Deploy two separate ECS services:

1. API service (`hireapp-backend-service`)
   - min tasks: 2
   - max tasks: 10
   - target tracking:
     - CPU utilization target: 60%
     - ALB RequestCountPerTarget policy

2. Worker service (`hireapp-interview-worker-service`)
   - min tasks: 1
   - max tasks: 20
   - target tracking:
     - SQS `ApproximateNumberOfMessagesVisible`
     - target value 200 (≈ 1 worker per 200 queue depth)

Task definitions:
- `/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/.aws/backend-task-definition.json`
- `/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/.aws/interview-worker-task-definition.json`

## Queue + DLQ

- Main queue: `interview-processing-queue`
- DLQ: `interview-processing-dlq`
- `maxReceiveCount=5`
- CloudWatch alarm threshold: DLQ depth > 5

## S3 Retention

Bucket lifecycle rule:
- Prefix: `interview-videos/`
- Expiration: 30 days

No manual deletes are required for retention compliance.

## Cost Control

Run cost monitor hourly:
- Workflow: `/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/.github/workflows/interview-cost-monitor.yml`
- Script: `/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/cron/interviewCostMonitor.js`

If estimated daily cost exceeds threshold, upload ingress is disabled by system flag.

## Security Controls

- Server-side MIME whitelist: `video/mp4` only
- MP4 signature validation (`ftyp` check)
- File size max: 150MB
- Duration max: 3 minutes
- Rate limit: 3 uploads / 10 minutes per user
- Draft jobs hidden from public/worker feeds by `status='active'` filter
