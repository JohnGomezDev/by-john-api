import { SpotifyTrack } from './spotify-track.entity';

describe('SpotifyTrack', () => {
  const fixedNow = new Date('2026-01-15T10:00:00.000Z');
  const artists = [
    {
      id: 'artist-1',
      name: 'Artist One',
      spotifyUrl: 'https://open.spotify.com/artist/artist-1',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factory should create a track without a persisted id
  it('should create a track with provided props', () => {
    const track = SpotifyTrack.create({
      trackId: 'track-1',
      trackName: 'Song Title',
      artists,
      albumId: 'album-1',
      albumName: 'Album Title',
      albumCoverUrl: 'https://example.com/cover.jpg',
      spotifyUrl: 'https://open.spotify.com/track/track-1',
      previewUrl: 'https://example.com/preview.mp3',
      durationMs: 210000,
    });

    expect(track).toEqual(
      expect.objectContaining({
        id: null,
        trackId: 'track-1',
        trackName: 'Song Title',
        artists,
        albumId: 'album-1',
        albumName: 'Album Title',
        albumCoverUrl: 'https://example.com/cover.jpg',
        spotifyUrl: 'https://open.spotify.com/track/track-1',
        previewUrl: 'https://example.com/preview.mp3',
        durationMs: 210000,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      }),
    );
  });

  // Factory should default missing previewUrl to null
  it('should default previewUrl to null when omitted', () => {
    const track = SpotifyTrack.create({
      trackId: 'track-1',
      trackName: 'Song Title',
      artists,
      albumId: 'album-1',
      albumName: 'Album Title',
      albumCoverUrl: 'https://example.com/cover.jpg',
      spotifyUrl: 'https://open.spotify.com/track/track-1',
      durationMs: 210000,
    });

    expect(track.previewUrl).toBeNull();
  });
});
