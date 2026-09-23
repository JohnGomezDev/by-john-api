import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  SONG_REPOSITORY,
  type ISongRepository,
} from '../../../domain/repositories/song.repository.interface';
import { SONGS_MESSAGES } from '../../constants/songs-messages.constants';

const DEEZER_TRACK_URL = 'https://api.deezer.com/track';

export type TArtist = {
  id: string;
  name: string;
  url: string;
};

export interface IFavoriteSong {
  id: number;
  trackId: string;
  trackName: string;
  artists: TArtist[];
  albumId: string;
  albumName: string;
  albumCoverUrl: string;
  url: string;
  previewUrl: string | null;
  durationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IDeezerTrackApiResponse {
  id: number;
  title: string;
  link: string;
  preview: string | null;
  duration: number;
  artist: {
    id: number;
    name: string;
    link: string;
  };
  album: {
    id: number;
    title: string;
    cover: string;
  };
}

@Injectable()
export class GetFavoriteSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepository: ISongRepository,
  ) {}

  async execute(): Promise<IFavoriteSong> {
    const song = await this.songRepository.findFirst();

    if (!song) {
      throw new NotFoundException(SONGS_MESSAGES.SONG_NOT_FOUND);
    }

    const response = await fetch(`${DEEZER_TRACK_URL}/${song.trackId}`);

    if (response.status === 404) {
      throw new NotFoundException(
        `Canción con id ${song.trackId} no encontrada en Deezer`,
      );
    }

    if (!response.ok) {
      throw new InternalServerErrorException(
        'No se pudo obtener la canción desde Deezer',
      );
    }

    const data = (await response.json()) as IDeezerTrackApiResponse;

    return {
      id: song.id!,
      trackId: String(data.id),
      trackName: data.title,
      artists: [
        {
          id: String(data.artist.id),
          name: data.artist.name,
          url: data.artist.link,
        },
      ],
      albumId: String(data.album.id),
      albumName: data.album.title,
      albumCoverUrl: data.album.cover,
      url: data.link,
      previewUrl: data.preview,
      durationMs: data.duration * 1000,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt,
    };
  }
}
