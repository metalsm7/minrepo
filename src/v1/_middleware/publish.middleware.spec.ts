import { PublishMiddleware } from './publish.middleware';

describe('PublishMiddleware', () => {
  it('should be defined', () => {
    expect(new PublishMiddleware()).toBeDefined();
  });
});
