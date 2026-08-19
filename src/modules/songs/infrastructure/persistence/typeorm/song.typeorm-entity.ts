import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TArtist } from '../../../domain/entities/song.entity';

@Entity('songs')
export class SongTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'track_id', type: 'varchar', length: 255 })
  trackId: string;

  @Column({ name: 'track_name', type: 'varchar', length: 255 })
  trackName: string;

  @Column({ type: 'jsonb' })
  artists: TArtist[];

  @Column({ name: 'album_id', type: 'varchar', length: 255 })
  albumId: string;

  @Column({ name: 'album_name', type: 'varchar', length: 255 })
  albumName: string;

  @Column({ name: 'album_cover_url', type: 'varchar', length: 2048 })
  albumCoverUrl: string;

  @Column({ name: 'url', type: 'varchar', length: 2048 })
  url: string;

  @Column({
    name: 'preview_url',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  previewUrl: string | null;

  @Column({ name: 'duration_ms', type: 'int' })
  durationMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
