import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { SongsModule } from './modules/songs/songs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      errorMessage: 'Demasiadas solicitudes, intenta de nuevo más tarde',
      throttlers: [
        { name: 'short', ttl: 1_000, limit: 3 },
        { name: 'medium', ttl: 60_000, limit: 20 },
        { name: 'long', ttl: 3_600_000, limit: 200 },
      ],
    }),
    DatabaseModule,
    AdminModule,
    AuthModule,
    BlogModule,
    SongsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
