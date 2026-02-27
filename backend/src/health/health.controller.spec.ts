import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should return ok status', () => {
    const controller = new HealthController();
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });
});

