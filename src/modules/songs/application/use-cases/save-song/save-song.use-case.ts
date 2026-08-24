import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Song, type TArtist } from '../../../domain/entities/song.entity';
import {
  SONG_REPOSITORY,
  type ISongRepository,
} from '../../../domain/repositories/song.repository.interface';

const DEEZER_TRACK_URL = 'https://api.deezer.com/track';

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
export class SaveSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepository: ISongRepository,
  ) {}

  async execute(trackId: string): Promise<Song> {
    const response = await fetch(`${DEEZER_TRACK_URL}/${trackId}`);

    if (response.status === 404) {
      throw new NotFoundException(
        `Canción con id ${trackId} no encontrada en Deezer`,
      );
    }

    if (!response.ok) {
      throw new InternalServerErrorException(
        'No se pudo obtener la canción desde Deezer',
      );
    }

    const data = (await response.json()) as IDeezerTrackApiResponse;

    const artists: TArtist[] = [
      {
        id: String(data.artist.id),
        name: data.artist.name,
        url: data.artist.link,
      },
    ];

    const songData = {
      trackId: String(data.id),
      trackName: data.title,
      artists,
      albumId: String(data.album.id),
      albumName: data.album.title,
      albumCoverUrl: data.album.cover,
      url: data.link,
      previewUrl: data.preview,
      durationMs: data.duration * 1000,
    };

    const existing = await this.songRepository.findFirst();
    const song = existing
      ? existing.replaceWith(songData)
      : Song.create(songData);

    return await this.songRepository.save(song);
  }
}
