import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 30,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000', 'avg<1200']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';
const TENANT_ID = __ENV.TENANT_ID || '11111111-1111-1111-1111-111111111111';
const EMAIL = __ENV.EMAIL || 'admin@demo.com';
const PASSWORD = __ENV.PASSWORD || 'Admin123!';

function login() {
  const payload = JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    tenantId: TENANT_ID
  });

  const response = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID
    }
  });

  check(response, {
    'login status 201/200': (r) => r.status === 200 || r.status === 201
  });

  const body = response.json();
  return body?.accessToken;
}

export default function () {
  const token = login();
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': TENANT_ID
  };

  const endpoints = [
    `${BASE_URL}/kpis/summary`,
    `${BASE_URL}/kpis/sales-report-comparative`,
    `${BASE_URL}/kpis/advisor-compliance/current`,
    `${BASE_URL}/kpis/regional-progress/current`,
    `${BASE_URL}/kpis/daily-sales`,
    `${BASE_URL}/ai/forecast`,
    `${BASE_URL}/ai/anomalies`
  ];

  endpoints.forEach((url) => {
    const response = http.get(url, { headers });
    check(response, {
      [`${url} status 200`]: (r) => r.status === 200
    });
  });

  sleep(1);
}
