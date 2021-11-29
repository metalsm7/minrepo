import { AccessCheckMiddleware } from './access-check.middleware';

describe('AccessCheckMiddleware', () => {
  it('should be defined', () => {
    expect(new AccessCheckMiddleware()).toBeDefined();
  });
});
