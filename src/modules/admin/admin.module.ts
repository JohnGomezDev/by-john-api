import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ADMIN_REPOSITORY } from './domain/repositories/admin.repository.interface';
import { AdminRepositoryImpl } from './infrastructure/persistence/admin.repository.impl';
import { AdminTypeOrmEntity } from './infrastructure/persistence/typeorm/admin.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminTypeOrmEntity])],
  providers: [{ provide: ADMIN_REPOSITORY, useClass: AdminRepositoryImpl }],
  exports: [TypeOrmModule, ADMIN_REPOSITORY],
})
export class AdminModule {}
