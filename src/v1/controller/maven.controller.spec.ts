import { Test, TestingModule } from '@nestjs/testing';
import { MavenController } from './maven.controller';

describe('MavenController', () => {
  let controller: MavenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MavenController],
    }).compile();

    controller = module.get<MavenController>(MavenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
