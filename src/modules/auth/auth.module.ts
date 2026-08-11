import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRefreshTokenTypeOrmEntity } from './infrastructure/persistence/typeorm/admin-refresh-token.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminRefreshTokenTypeOrmEntity])],
  exports: [TypeOrmModule],
})
export class AuthModule {}
