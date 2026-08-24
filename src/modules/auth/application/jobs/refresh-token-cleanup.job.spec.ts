import { Test } from '@nestjs/testing';
import { ADMIN_REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/admin-refresh-token.repository.interface';
import { RefreshTokenCleanupJob } from './refresh-token-cleanup.job';

interface IMockedRefreshTokenRepository {
  save: jest.Mock;
  findById: jest.Mock;
  deleteById: jest.Mock;
  deleteExpired: jest.Mock;
}

describe('RefreshTokenCleanupJob', () => {
  let job: RefreshTokenCleanupJob;
  let refreshTokenRepository: IMockedRefreshTokenRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenCleanupJob,
        {
          provide: ADMIN_REFRESH_TOKEN_REPOSITORY,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            deleteById: jest.fn(),
            deleteExpired: jest.fn(),
          },
        },
      ],
    }).compile();

    job = module.get(RefreshTokenCleanupJob);
    refreshTokenRepository = module.get(ADMIN_REFRESH_TOKEN_REPOSITORY);
  });

  // Cleanup handler should delegate to the repository's deleteExpired method
  it('should call deleteExpired on the repository', async () => {
    refreshTokenRepository.deleteExpired.mockResolvedValue(3);

    await job.handleCleanup();

    expect(refreshTokenRepository.deleteExpired).toHaveBeenCalledTimes(1);
  });

  // Cleanup handler should not throw when there are no expired tokens
  it('should not throw when there are no expired tokens to remove', async () => {
    refreshTokenRepository.deleteExpired.mockResolvedValue(0);

    await expect(job.handleCleanup()).resolves.toBeUndefined();
  });
});
