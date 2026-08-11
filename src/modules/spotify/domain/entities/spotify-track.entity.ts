export type TSpotifyArtist = {
  id: string;
  name: string;
  spotifyUrl: string;
};

export class SpotifyTrack {
  constructor(
    readonly id: number | null,
    readonly trackId: string,
    readonly trackName: string,
    readonly artists: TSpotifyArtist[],
    readonly albumId: string,
    readonly albumName: string,
    readonly albumCoverUrl: string,
    readonly spotifyUrl: string,
    readonly previewUrl: string | null,
    readonly durationMs: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    trackId: string;
    trackName: string;
    artists: TSpotifyArtist[];
    albumId: string;
    albumName: string;
    albumCoverUrl: string;
    spotifyUrl: string;
    previewUrl?: string | null;
    durationMs: number;
  }): SpotifyTrack {
    const now = new Date();
    return new SpotifyTrack(
      null,
      props.trackId,
      props.trackName,
      props.artists,
      props.albumId,
      props.albumName,
      props.albumCoverUrl,
      props.spotifyUrl,
      props.previewUrl ?? null,
      props.durationMs,
      now,
      now,
    );
  }
}
