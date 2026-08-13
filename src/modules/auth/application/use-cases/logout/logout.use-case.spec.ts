import { Test } from '@nestjs/testing';
import { ADMIN_REFRESH_TOKEN_REPOSITORY } from '../../../domain/repositories/admin-refresh-token.repository.interface';
import { LogoutUseCase } from './logout.use-case';

interface IMockedRefreshTokenRepository {
  save: jest.Mock;
  findById: jest.Mock;
  deleteById: jest.Mock;
  deleteExpired: jest.Mock;
}

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let refreshTokenRepository: IMockedRefreshTokenRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
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

    useCase = module.get(LogoutUseCase);
    refreshTokenRepository = module.get(ADMIN_REFRESH_TOKEN_REPOSITORY);
  });

  // A valid cookie should delete the corresponding whitelist row
  it('should delete the whitelist row for a valid cookie', async () => {
    await useCase.execute('token-id.secret');

    expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith('token-id');
  });

  // Logout is idempotent: a missing cookie should not throw nor touch the repository
  it('should not throw and should not call the repository when the cookie is missing', async () => {
    await expect(useCase.execute(undefined)).resolves.toBeUndefined();
    expect(refreshTokenRepository.deleteById).not.toHaveBeenCalled();
  });

  // Logout is idempotent: a malformed cookie should not throw nor touch the repository
  it('should not throw and should not call the repository when the cookie is malformed', async () => {
    await expect(
      useCase.execute('malformed-cookie-without-dot'),
    ).resolves.toBeUndefined();
    expect(refreshTokenRepository.deleteById).not.toHaveBeenCalled();
  });
});
