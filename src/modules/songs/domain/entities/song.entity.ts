export class Song {
  constructor(
    readonly id: number | null,
    readonly trackId: string,
    readonly trackName: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(props: { trackId: string; trackName: string }): Song {
    const now = new Date();
    return new Song(null, props.trackId, props.trackName, now, now);
  }

  /**
   * Replaces track data while preserving the persisted id and createdAt.
   * Used for the single-song upsert flow.
   */
  replaceWith(props: { trackId: string; trackName: string }): Song {
    return new Song(
      this.id,
      props.trackId,
      props.trackName,
      this.createdAt,
      new Date(),
    );
  }
}
