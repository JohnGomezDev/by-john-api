import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminRefreshTokenTypeOrmEntity } from '../../../../auth/infrastructure/persistence/typeorm/admin-refresh-token.typeorm-entity';
import { PostTypeOrmEntity } from '../../../../blog/infrastructure/persistence/typeorm/post.typeorm-entity';

@Entity('admin_users')
export class AdminTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => PostTypeOrmEntity, (post) => post.admin)
  posts: PostTypeOrmEntity[];

  @OneToMany(() => AdminRefreshTokenTypeOrmEntity, (token) => token.admin)
  refreshTokens: AdminRefreshTokenTypeOrmEntity[];
}
