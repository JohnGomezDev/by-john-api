import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: { getOrThrow: jest.Mock };

  beforeEach(() => {
    configService = { getOrThrow: jest.fn().mockReturnValue('access-secret') };
    strategy = new JwtStrategy(configService as unknown as ConfigService);
  });

  // validate() must expose the shape consumed by @CurrentUser()
  it('should return the current user shape from the JWT payload', () => {
    const result = strategy.validate({ sub: 'admin-id', username: 'admin' });

    expect(result).toEqual({ id: 'admin-id', username: 'admin' });
  });
});
