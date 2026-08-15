import { Song } from './song.entity';

describe('Song', () => {
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');
  const artists = [
    {
      id: '13',
      name: 'Eminem',
      url: 'https://www.deezer.com/artist/13',
    },
  ];

  const baseProps = {
    trackId: '3135556',
    trackName: 'Lose Yourself',
    artists,
    albumId: '302127',
    albumName: '8 Mile',
    albumCoverUrl: 'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
    url: 'https://www.deezer.com/track/3135556',
    previewUrl: 'https://cdns-preview.dzcdn.net/stream/preview.mp3',
    durationMs: 326000,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create a song without a persisted id
  it('should create a song with provided props', () => {
    const song = Song.create(baseProps);

    expect(song).toEqual(
      expect.objectContaining({
        id: null,
        trackId: '3135556',
        trackName: 'Lose Yourself',
        artists,
        albumId: '302127',
        albumName: '8 Mile',
        albumCoverUrl: 'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
        url: 'https://www.deezer.com/track/3135556',
        previewUrl: 'https://cdns-preview.dzcdn.net/stream/preview.mp3',
        durationMs: 326000,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      }),
    );
  });

  // Factory should default missing previewUrl to null
  it('should default previewUrl to null when omitted', () => {
    const { previewUrl: _previewUrl, ...propsWithoutPreview } = baseProps;
    const song = Song.create(propsWithoutPreview);

    expect(song.previewUrl).toBeNull();
  });

  // replaceWith should keep id and createdAt while updating the rest
  it('should replace track data while preserving id and createdAt', () => {
    const existing = new Song(
      1,
      'old-track',
      'Old Title',
      artists,
      'old-album',
      'Old Album',
      'https://example.com/old-cover.jpg',
      'https://www.deezer.com/track/old',
      null,
      100000,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );

    const updatedAt = new Date('2026-02-01T12:00:00.000Z');
    jest.setSystemTime(updatedAt);

    const replaced = existing.replaceWith(baseProps);

    expect(replaced).toEqual(
      expect.objectContaining({
        id: 1,
        trackId: '3135556',
        trackName: 'Lose Yourself',
        artists,
        albumId: '302127',
        albumName: '8 Mile',
        albumCoverUrl: 'https://cdns-images.dzcdn.net/images/cover/cover.jpg',
        url: 'https://www.deezer.com/track/3135556',
        previewUrl: 'https://cdns-preview.dzcdn.net/stream/preview.mp3',
        durationMs: 326000,
        createdAt: existing.createdAt,
        updatedAt,
      }),
    );
  });
});
