import { NestFactory } from '@nestjs/core';
import { bootstrap } from './main';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn().mockReturnValue({
      setGlobalPrefix: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      use: jest.fn(),
      listen: jest.fn(),
    }),
  },
}));

jest.mock('@nestjs/common', () => {
  const actual: Record<string, unknown> = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: jest.fn().mockReturnValue({ log: jest.fn() }),
  };
});

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockReturnValue({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addBearerAuth: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue('doc-config'),
  }),
  ApiProperty: jest.fn(),
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue('doc'),
    setup: jest.fn(),
  },
}));

jest.mock('./app.module', () => ({
  AppModule: jest.fn().mockReturnValue('AppModule'),
}));

describe('main', () => {
  let mockApp: {
    setGlobalPrefix: jest.Mock;
    enableCors: jest.Mock;
    useGlobalPipes: jest.Mock;
    useGlobalFilters: jest.Mock;
    use: jest.Mock;
    listen: jest.Mock;
  };

  let mockLogger: { log: jest.Mock };

  beforeEach(() => {
    mockApp = {
      setGlobalPrefix: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      use: jest.fn(),
      listen: jest.fn(),
    };

    mockLogger = { log: jest.fn() };

    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
    (Logger as unknown as jest.Mock).mockReturnValue(mockLogger);
  });

  // App should be created with app module
  it('should create app with app module', async () => {
    const port = process.env.PORT ?? 3000;

    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
    expect(mockLogger.log).toHaveBeenCalledWith(
      `Application running on http://localhost:${port}/api`,
    );
  });

  // Global prefix should be set
  it('should set global prefix', async () => {
    await bootstrap();

    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api');
  });

  // CORS configuration should be set
  it('should set cors config', async () => {
    await bootstrap();

    expect(mockApp.enableCors).toHaveBeenCalledWith({
      origin: process.env.CORS_ORIGIN?.split(',') ?? true,
      credentials: true,
    });
  });

  // Global pipes should be set
  it('should set global pipes', async () => {
    await bootstrap();

    expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
      expect.objectContaining({
        errorHttpStatusCode: 400,
        validatorOptions: expect.objectContaining({
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      }),
    );
  });

  // App should listen on defined port
  it('should listen on defined port', async () => {
    const port = process.env.PORT ?? 3000;

    await bootstrap();

    expect(mockApp.listen).toHaveBeenCalledWith(port);
  });

  // Document builder should be called
  it('should call document builder', async () => {
    await bootstrap();

    expect(DocumentBuilder).toHaveBeenCalled();
  });

  // Swagger document should be created
  it('should create swagger document', async () => {
    await bootstrap();

    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
      mockApp,
      'doc-config',
    );
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'api/docs',
      mockApp,
      'doc',
    );
  });
});
