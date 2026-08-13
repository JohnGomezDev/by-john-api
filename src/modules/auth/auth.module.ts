import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HASHER } from '../../common/security/hasher.interface';
import { BcryptHasherImpl } from '../../common/security/bcrypt-hasher.impl';
import { AdminModule } from '../admin/admin.module';
import { RefreshTokenCleanupJob } from './application/jobs/refresh-token-cleanup.job';
import { LoginUseCase } from './application/use-cases/login/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token/refresh-token.use-case';
import { ADMIN_REFRESH_TOKEN_REPOSITORY } from './domain/repositories/admin-refresh-token.repository.interface';
import { AuthController } from './infrastructure/http/auth.controller';
import { AdminRefreshTokenRepositoryImpl } from './infrastructure/persistence/admin-refresh-token.repository.impl';
import { AdminRefreshTokenTypeOrmEntity } from './infrastructure/persistence/typeorm/admin-refresh-token.typeorm-entity';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';

@Module({
  imports: [
    AdminModule,
    PassportModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AdminRefreshTokenTypeOrmEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: ADMIN_REFRESH_TOKEN_REPOSITORY,
      useClass: AdminRefreshTokenRepositoryImpl,
    },
    { provide: HASHER, useClass: BcryptHasherImpl },
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RefreshTokenCleanupJob,
    JwtStrategy,
  ],
  exports: [TypeOrmModule],
})
export class AuthModule {}
