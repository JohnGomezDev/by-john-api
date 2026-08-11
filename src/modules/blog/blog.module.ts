import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryTypeOrmEntity } from './infrastructure/persistence/typeorm/category.typeorm-entity';
import { PostTypeOrmEntity } from './infrastructure/persistence/typeorm/post.typeorm-entity';
import { TagTypeOrmEntity } from './infrastructure/persistence/typeorm/tag.typeorm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostTypeOrmEntity,
      CategoryTypeOrmEntity,
      TagTypeOrmEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class BlogModule {}
