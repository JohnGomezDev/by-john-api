import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Song } from '../../../domain/entities/song.entity';
import {
  SONG_REPOSITORY,
  type ISongRepository,
} from '../../../domain/repositories/song.repository.interface';
import { SONGS_MESSAGES } from '../../constants/songs-messages.constants';

@Injectable()
export class GetFavoriteSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepository: ISongRepository,
  ) {}

  async execute(): Promise<Song> {
    const song = await this.songRepository.findFirst();

    if (!song) {
      throw new NotFoundException(SONGS_MESSAGES.SONG_NOT_FOUND);
    }

    return song;
  }
}
