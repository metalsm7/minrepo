import { RequestExtendMiddleware } from './request-extend.middleware';

describe('RequestExtendMiddleware', () => {
  it('should be defined', () => {
    expect(new RequestExtendMiddleware()).toBeDefined();
  });
});
