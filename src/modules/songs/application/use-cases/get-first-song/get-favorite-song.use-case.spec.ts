import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Song } from '../../../domain/entities/song.entity';
import { SONG_REPOSITORY } from '../../../domain/repositories/song.repository.interface';
import { SONGS_MESSAGES } from '../../constants/songs-messages.constants';
import { GetFavoriteSongUseCase } from './get-favorite-song.use-case';

interface IMockedSongRepository {
  findFirst: jest.Mock;
}

describe('GetFavoriteSongUseCase', () => {
  let useCase: GetFavoriteSongUseCase;
  let songRepository: IMockedSongRepository;
  let fetchMock: jest.Mock;

  const storedSong = new Song(
    1,
    '3135556',
    'Lose Yourself',
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-01-02T00:00:00.000Z'),
  );

  const deezerTrackResponse = {
    id: 3135556,
    title: 'Lose Yourself',
    link: 'https://www.deezer.com/track/3135556',
    preview: 'https://cdns-preview.dzcdn.net/stream/preview.mp3',
    duration: 326,
    artist: {
      id: 13,
      name: 'Eminem',
      link: 'https://www.deezer.com/artist/13',
    },
    album: {
      id: 302127,
      title: '8 Mile',
      cover: 'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
    },
  };

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const module = await Test.createTestingModule({
      providers: [
        GetFavoriteSongUseCase,
        {
          provide: SONG_REPOSITORY,
          useValue: {
            findFirst: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetFavoriteSongUseCase);
    songRepository = module.get(SONG_REPOSITORY);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // When a song exists it should be enriched with a fresh Deezer fetch
  it('should fetch Deezer data for the stored favorite song', async () => {
    songRepository.findFirst.mockResolvedValue(storedSong);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => deezerTrackResponse,
    });

    const result = await useCase.execute();

    expect(songRepository.findFirst).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deezer.com/track/3135556',
    );
    expect(result).toEqual({
      id: 1,
      trackId: '3135556',
      trackName: 'Lose Yourself',
      artists: [
        {
          id: '13',
          name: 'Eminem',
          url: 'https://www.deezer.com/artist/13',
        },
      ],
      albumId: '302127',
      albumName: '8 Mile',
      albumCoverUrl: 'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
      url: 'https://www.deezer.com/track/3135556',
      previewUrl: 'https://cdns-preview.dzcdn.net/stream/preview.mp3',
      durationMs: 326000,
      createdAt: storedSong.createdAt,
      updatedAt: storedSong.updatedAt,
    });
  });

  // When the table is empty the use case should throw NotFoundException
  it('should throw NotFoundException when no song exists', async () => {
    songRepository.findFirst.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(
      new NotFoundException(SONGS_MESSAGES.SONG_NOT_FOUND),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // A missing Deezer track should surface as NotFoundException
  it('should throw NotFoundException when Deezer returns 404', async () => {
    songRepository.findFirst.mockResolvedValue(storedSong);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => ({}),
    });

    await expect(useCase.execute()).rejects.toThrow(
      new NotFoundException('Canción con id 3135556 no encontrada en Deezer'),
    );
  });

  // A Deezer API failure should surface as InternalServerErrorException
  it('should throw InternalServerErrorException when Deezer request fails', async () => {
    songRepository.findFirst.mockResolvedValue(storedSong);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => ({}),
    });

    await expect(useCase.execute()).rejects.toThrow(
      new InternalServerErrorException(
        'No se pudo obtener la canción desde Deezer',
      ),
    );
  });
});
