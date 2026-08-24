import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { AdminTypeOrmEntity } from '../../../../admin/infrastructure/persistence/typeorm/admin.typeorm-entity';

@Entity('admin_refresh_tokens')
@Index('idx_refresh_token_expires_at', ['expiresAt'])
@Index('idx_refresh_token_hash', ['tokenHash'])
export class AdminRefreshTokenTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 255 })
  userAgent: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @ManyToOne(() => AdminTypeOrmEntity, (admin) => admin.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'admin_id' })
  admin: AdminTypeOrmEntity;
}
