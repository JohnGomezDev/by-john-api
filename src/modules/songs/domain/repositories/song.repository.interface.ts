import type { Song } from '../entities/song.entity';

export const SONG_REPOSITORY = 'SONG_REPOSITORY';

export interface ISongRepository {
  save(song: Song): Promise<Song>;
  findFirst(): Promise<Song | null>;
}
