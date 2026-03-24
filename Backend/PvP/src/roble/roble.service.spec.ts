import { Test, TestingModule } from '@nestjs/testing';
import { RobleService } from './roble.service';

describe('RobleService', () => {
  let service: RobleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RobleService],
    }).compile();

    service = module.get<RobleService>(RobleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
