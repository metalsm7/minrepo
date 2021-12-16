import { Test, TestingModule } from '@nestjs/testing';
import { AuthProvider } from './auth.provider';

describe('AuthProvider', () => {
  let service: AuthProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthProvider],
    }).compile();

    service = module.get<AuthProvider>(AuthProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
