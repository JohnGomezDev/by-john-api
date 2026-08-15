import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Song } from '../../../domain/entities/song.entity';
import { SONG_REPOSITORY } from '../../../domain/repositories/song.repository.interface';
import { SaveSongUseCase } from './save-song.use-case';

interface IMockedSongRepository {
  save: jest.Mock;
  findFirst: jest.Mock;
}

describe('SaveSongUseCase', () => {
  let useCase: SaveSongUseCase;
  let songRepository: IMockedSongRepository;
  let fetchMock: jest.Mock;

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
        SaveSongUseCase,
        {
          provide: SONG_REPOSITORY,
          useValue: {
            save: jest.fn(),
            findFirst: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(SaveSongUseCase);
    songRepository = module.get(SONG_REPOSITORY);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // When no song exists, a new one should be created and persisted
  it('should create and save a new song when none exists', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => deezerTrackResponse,
    });
    songRepository.findFirst.mockResolvedValue(null);
    songRepository.save.mockImplementation((song: Song) =>
      Promise.resolve(song),
    );

    const result = await useCase.execute('3135556');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deezer.com/track/3135556',
    );
    expect(songRepository.findFirst).toHaveBeenCalledTimes(1);
    expect(songRepository.save).toHaveBeenCalledTimes(1);
    expect(result.id).toBeNull();
    expect(result.trackId).toBe('3135556');
    expect(result.trackName).toBe('Lose Yourself');
    expect(result.durationMs).toBe(326000);
    expect(result.artists).toEqual([
      {
        id: '13',
        name: 'Eminem',
        url: 'https://www.deezer.com/artist/13',
      },
    ]);
  });

  // When a song already exists, that same row should be updated with the new track data
  it('should update the existing song when one already exists', async () => {
    const existing = new Song(
      1,
      'old-id',
      'Old Title',
      [{ id: '1', name: 'Old', url: 'https://www.deezer.com/artist/1' }],
      'old-album',
      'Old Album',
      'https://example.com/old.jpg',
      'https://www.deezer.com/track/old',
      null,
      100000,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => deezerTrackResponse,
    });
    songRepository.findFirst.mockResolvedValue(existing);
    songRepository.save.mockImplementation((song: Song) =>
      Promise.resolve(song),
    );

    const result = await useCase.execute('3135556');

    expect(songRepository.save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(1);
    expect(result.createdAt).toEqual(existing.createdAt);
    expect(result.trackId).toBe('3135556');
    expect(result.trackName).toBe('Lose Yourself');
    expect(result.durationMs).toBe(326000);
  });

  // A missing Deezer track should surface as NotFoundException
  it('should throw NotFoundException when Deezer returns 404', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(useCase.execute('999999')).rejects.toThrow(
      new NotFoundException('Canción con id 999999 no encontrada en Deezer'),
    );
    expect(songRepository.findFirst).not.toHaveBeenCalled();
    expect(songRepository.save).not.toHaveBeenCalled();
  });

  // A Deezer API failure should surface as InternalServerErrorException
  it('should throw InternalServerErrorException when Deezer request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(useCase.execute('3135556')).rejects.toThrow(
      new InternalServerErrorException(
        'No se pudo obtener la canción desde Deezer',
      ),
    );
    expect(songRepository.save).not.toHaveBeenCalled();
  });
});
