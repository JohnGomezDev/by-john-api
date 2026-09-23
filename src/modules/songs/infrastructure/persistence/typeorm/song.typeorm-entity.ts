import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('songs')
export class SongTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'track_id', type: 'varchar', length: 255 })
  trackId: string;

  @Column({ name: 'track_name', type: 'varchar', length: 255 })
  trackName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
