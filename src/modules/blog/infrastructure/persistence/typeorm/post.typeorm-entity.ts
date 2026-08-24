import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminTypeOrmEntity } from '../../../../admin/infrastructure/persistence/typeorm/admin.typeorm-entity';
import { CategoryTypeOrmEntity } from './category.typeorm-entity';
import { TagTypeOrmEntity } from './tag.typeorm-entity';

@Entity('posts')
@Index('idx_post_slug', ['slug'], { unique: true })
@Index('idx_post_category', ['categoryId'])
@Index('idx_post_search', ['searchVector'])
export class PostTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 160 })
  excerpt: string;

  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle: string | null;

  @Column({
    name: 'meta_description',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  metaDescription: string | null;

  @Column({
    name: 'og_image_url',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  ogImageUrl: string | null;

  @Column({
    name: 'search_vector',
    type: 'tsvector',
    generatedType: 'STORED',
    asExpression:
      "to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(content, ''))",
    select: false,
  })
  searchVector?: string;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => AdminTypeOrmEntity, (admin) => admin.posts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'admin_id' })
  admin: AdminTypeOrmEntity;

  @ManyToOne(() => CategoryTypeOrmEntity, (category) => category.posts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: CategoryTypeOrmEntity;

  @ManyToMany(() => TagTypeOrmEntity, (tag) => tag.posts)
  @JoinTable({
    name: 'post_tag',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: TagTypeOrmEntity[];
}
