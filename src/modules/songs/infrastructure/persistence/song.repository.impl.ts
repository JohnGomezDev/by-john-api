import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Song } from '../../domain/entities/song.entity';
import type { ISongRepository } from '../../domain/repositories/song.repository.interface';
import { SongTypeOrmEntity } from './typeorm/song.typeorm-entity';

@Injectable()
export class SongRepositoryImpl implements ISongRepository {
  constructor(
    @InjectRepository(SongTypeOrmEntity)
    private readonly ormRepo: Repository<SongTypeOrmEntity>,
  ) {}

  async save(song: Song): Promise<Song> {
    const saved = await this.ormRepo.save(this.toOrm(song));
    return this.toDomain(saved);
  }

  async findFirst(): Promise<Song | null> {
    const entity = await this.ormRepo.findOne({
      where: {},
      order: { id: 'ASC' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  private toOrm(song: Song): SongTypeOrmEntity {
    const e = new SongTypeOrmEntity();
    if (song.id !== null) {
      e.id = song.id;
    }
    e.trackId = song.trackId;
    e.trackName = song.trackName;
    e.artists = song.artists;
    e.albumId = song.albumId;
    e.albumName = song.albumName;
    e.albumCoverUrl = song.albumCoverUrl;
    e.url = song.url;
    e.previewUrl = song.previewUrl;
    e.durationMs = song.durationMs;
    e.createdAt = song.createdAt;
    e.updatedAt = song.updatedAt;
    return e;
  }

  private toDomain(e: SongTypeOrmEntity): Song {
    return new Song(
      e.id,
      e.trackId,
      e.trackName,
      e.artists,
      e.albumId,
      e.albumName,
      e.albumCoverUrl,
      e.url,
      e.previewUrl,
      e.durationMs,
      e.createdAt,
      e.updatedAt,
    );
  }
}
