import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class ObservabilityService {
  private readonly registry: Registry;
  private readonly httpRequestCounter: Counter<'method' | 'route' | 'status'>;
  private readonly httpRequestDuration: Histogram<'method' | 'route' | 'status'>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'salesforce_'
    });

    this.httpRequestCounter = new Counter({
      name: 'salesforce_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry]
    });

    this.httpRequestDuration = new Histogram({
      name: 'salesforce_http_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.03, 0.08, 0.15, 0.25, 0.5, 1, 2, 4],
      registers: [this.registry]
    });
  }

  startTimer(method: string, route: string) {
    const end = this.httpRequestDuration.startTimer({
      method,
      route,
      status: 'pending'
    });

    return (status: string) => {
      this.httpRequestCounter.inc({
        method,
        route,
        status
      });
      end({
        method,
        route,
        status
      });
    };
  }

  getContentType() {
    return this.registry.contentType;
  }

  async getMetrics() {
    return this.registry.metrics();
  }
}
