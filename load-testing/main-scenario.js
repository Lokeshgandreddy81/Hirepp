import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '30s', target: 50 }, // Ramp up to 50 concurrent users
        { duration: '1m', target: 100 }, // Ramp up and hold 100 users
        { duration: '30s', target: 0 },  // Ramp down to 0
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'], // 95% of requests should be under 500ms
        'errors': ['rate<0.05'], // Error rate should be under 5%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5001/api';

export default function () {
    // Scenario 1: Health check (Baseline test)
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health check status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(1);

    // Scenario 2: Browsing Jobs (Simulated candidate behavior)
    const jobsRes = http.get(`${BASE_URL}/jobs`);
    check(jobsRes, {
        'jobs fetched successfully': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(2);
}
