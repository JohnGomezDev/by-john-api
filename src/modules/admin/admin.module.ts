import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminTypeOrmEntity } from './infrastructure/persistence/typeorm/admin.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminTypeOrmEntity])],
  exports: [TypeOrmModule],
})
export class AdminModule {}
