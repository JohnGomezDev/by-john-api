export type TArtist = {
  id: string;
  name: string;
  url: string;
};

export class Song {
  constructor(
    readonly id: number | null,
    readonly trackId: string,
    readonly trackName: string,
    readonly artists: TArtist[],
    readonly albumId: string,
    readonly albumName: string,
    readonly albumCoverUrl: string,
    readonly url: string,
    readonly previewUrl: string | null,
    readonly durationMs: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    trackId: string;
    trackName: string;
    artists: TArtist[];
    albumId: string;
    albumName: string;
    albumCoverUrl: string;
    url: string;
    previewUrl?: string | null;
    durationMs: number;
  }): Song {
    const now = new Date();
    return new Song(
      null,
      props.trackId,
      props.trackName,
      props.artists,
      props.albumId,
      props.albumName,
      props.albumCoverUrl,
      props.url,
      props.previewUrl ?? null,
      props.durationMs,
      now,
      now,
    );
  }

  /**
   * Replaces all track data while preserving the persisted id and createdAt.
   * Used for the single-song upsert flow.
   */
  replaceWith(props: {
    trackId: string;
    trackName: string;
    artists: TArtist[];
    albumId: string;
    albumName: string;
    albumCoverUrl: string;
    url: string;
    previewUrl?: string | null;
    durationMs: number;
  }): Song {
    return new Song(
      this.id,
      props.trackId,
      props.trackName,
      props.artists,
      props.albumId,
      props.albumName,
      props.albumCoverUrl,
      props.url,
      props.previewUrl ?? null,
      props.durationMs,
      this.createdAt,
      new Date(),
    );
  }
}
