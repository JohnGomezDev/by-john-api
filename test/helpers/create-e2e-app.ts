import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  getOptionsToken,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

/**
 * `ThrottlerGuard` is bound globally via `APP_GUARD`, which Nest registers under a
 * randomly generated token per test run — it cannot be targeted with `overrideProvider`.
 * Overriding the options it reads (`skipIf: () => true`) disables every named throttler
 * (short/medium/long) instead, without touching the global guard binding.
 */
const disabledThrottlerOptions: ThrottlerModuleOptions = {
  throttlers: [{ ttl: 60_000, limit: 1 }],
  skipIf: () => true,
};

export async function createE2eApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(getOptionsToken())
    .useValue(disabledThrottlerOptions)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  return app;
}
