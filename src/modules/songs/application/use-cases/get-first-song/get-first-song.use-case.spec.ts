import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Song } from '../../../domain/entities/song.entity';
import { SONG_REPOSITORY } from '../../../domain/repositories/song.repository.interface';
import { SONGS_MESSAGES } from '../../constants/songs-messages.constants';
import { GetFirstSongUseCase } from './get-first-song.use-case';

interface IMockedSongRepository {
  findFirst: jest.Mock;
}

describe('GetFirstSongUseCase', () => {
  let useCase: GetFirstSongUseCase;
  let songRepository: IMockedSongRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetFirstSongUseCase,
        {
          provide: SONG_REPOSITORY,
          useValue: {
            findFirst: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetFirstSongUseCase);
    songRepository = module.get(SONG_REPOSITORY);
  });

  // When a song exists it should be returned as-is
  it('should return the first song when one exists', async () => {
    const song = new Song(
      1,
      '3135556',
      'Lose Yourself',
      [
        {
          id: '13',
          name: 'Eminem',
          url: 'https://www.deezer.com/artist/13',
        },
      ],
      '302127',
      '8 Mile',
      'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
      'https://www.deezer.com/track/3135556',
      'https://cdns-preview.dzcdn.net/stream/preview.mp3',
      326000,
      new Date('2026-01-01'),
      new Date('2026-01-01'),
    );
    songRepository.findFirst.mockResolvedValue(song);

    const result = await useCase.execute();

    expect(songRepository.findFirst).toHaveBeenCalledTimes(1);
    expect(result).toBe(song);
  });

  // When the table is empty the use case should throw NotFoundException
  it('should throw NotFoundException when no song exists', async () => {
    songRepository.findFirst.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(
      new NotFoundException(SONGS_MESSAGES.SONG_NOT_FOUND),
    );
  });
});
