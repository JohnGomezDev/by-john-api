import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Song } from '../../../domain/entities/song.entity';
import {
  SONG_REPOSITORY,
  type ISongRepository,
} from '../../../domain/repositories/song.repository.interface';

const DEEZER_TRACK_URL = 'https://api.deezer.com/track';

interface IDeezerTrackApiResponse {
  id: number;
  title: string;
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

    const songData = {
      trackId: String(data.id),
      trackName: data.title,
    };

    const existing = await this.songRepository.findFirst();
    const song = existing
      ? existing.replaceWith(songData)
      : Song.create(songData);

    return await this.songRepository.save(song);
  }
}
