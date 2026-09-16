import { Song } from './song.entity';

describe('Song', () => {
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');

  const baseProps = {
    trackId: '3135556',
    trackName: 'Lose Yourself',
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
        createdAt: fixedNow,
        updatedAt: fixedNow,
      }),
    );
  });

  // replaceWith should keep id and createdAt while updating track data
  it('should replace track data while preserving id and createdAt', () => {
    const existing = new Song(
      1,
      'old-track',
      'Old Title',
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
        createdAt: existing.createdAt,
        updatedAt,
      }),
    );
  });
});
