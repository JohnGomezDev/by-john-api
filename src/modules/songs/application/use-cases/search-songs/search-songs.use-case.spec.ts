import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SearchSongsUseCase } from './search-songs.use-case';

describe('SearchSongsUseCase', () => {
  let useCase: SearchSongsUseCase;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const module = await Test.createTestingModule({
      providers: [SearchSongsUseCase],
    }).compile();

    useCase = module.get(SearchSongsUseCase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Successful search should return only the mapped Deezer fields
  it('should return mapped songs from Deezer search', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => ({
        data: [
          {
            id: 3135556,
            title: 'Lose Yourself',
            link: 'https://www.deezer.com/track/3135556',
            preview: 'https://cdns-preview.dzcdn.net/stream/preview.mp3',
            duration: 326,
            type: 'track',
            readable: true,
            artist: {
              id: 13,
              name: 'Eminem',
              link: 'https://www.deezer.com/artist/13',
              picture: 'https://example.com/artist.jpg',
              tracklist: 'https://api.deezer.com/artist/13/top',
              type: 'artist',
            },
            album: {
              id: 302127,
              title: '8 Mile',
              cover: 'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
              cover_medium:
                'https://cdns-images.dzcdn.net/images/cover/cover-medium.jpg',
              tracklist: 'https://api.deezer.com/album/302127/tracks',
              type: 'album',
            },
          },
        ],
      }),
    });

    const result = await useCase.execute('Lose Yourself');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deezer.com/search?q=Lose+Yourself&limit=8',
    );
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0]).toEqual({
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
    });
    expect(result.songs[0]).not.toHaveProperty('type');
    expect(result.songs[0].artist).not.toHaveProperty('picture');
    expect(result.songs[0].album).not.toHaveProperty('cover_medium');
  });

  // A Deezer API failure should surface as InternalServerErrorException
  it('should throw InternalServerErrorException when Deezer request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => ({}),
    });

    await expect(useCase.execute('query')).rejects.toThrow(
      new InternalServerErrorException(
        'No se pudo realizar la búsqueda en Deezer',
      ),
    );
  });
});
