import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TSpotifyArtist } from '../../../domain/entities/spotify-track.entity';

@Entity('spotify_tracks')
export class SpotifyTrackTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'track_id', type: 'varchar', length: 255 })
  trackId: string;

  @Column({ name: 'track_name', type: 'varchar', length: 255 })
  trackName: string;

  @Column({ type: 'jsonb' })
  artists: TSpotifyArtist[];

  @Column({ name: 'album_id', type: 'varchar', length: 255 })
  albumId: string;

  @Column({ name: 'album_name', type: 'varchar', length: 255 })
  albumName: string;

  @Column({ name: 'album_cover_url', type: 'varchar', length: 2048 })
  albumCoverUrl: string;

  @Column({ name: 'spotify_url', type: 'varchar', length: 2048 })
  spotifyUrl: string;

  @Column({ name: 'preview_url', type: 'varchar', length: 2048, nullable: true })
  previewUrl: string | null;

  @Column({ name: 'duration_ms', type: 'int' })
  durationMs: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
