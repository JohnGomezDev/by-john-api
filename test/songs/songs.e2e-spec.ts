import { Logger, type INestApplication } from '@nestjs/common';
import { SONGS_MESSAGES } from '../../src/modules/songs/application/constants/songs-messages.constants';
import { createE2eApp } from '../helpers/create-e2e-app';
import { bearer, loginAs, type IE2eLoginResult } from '../helpers/auth.helper';
import {
  deleteAdminsByUsernames,
  deleteAllSongs,
  insertSong,
  upsertAdmin,
} from '../helpers/fixtures';
import { body, containing, http } from '../helpers/http.helper';

const ADMIN = {
  username: 'e2e.songs.admin',
  password: 'Songs123!',
  email: 'e2e.songs.admin@email.com',
  name: 'Songs',
  lastName: 'Admin',
};

const MOCK_SEARCH_ITEM = {
  id: 3135556,
  title: 'Lose Yourself',
  link: 'https://www.deezer.com/track/3135556',
  preview: 'https://example.com/preview.mp3',
  duration: 326,
  artist: {
    id: 13,
    name: 'Eminem',
    link: 'https://www.deezer.com/artist/13',
  },
  album: {
    id: 302127,
    title: '8 Mile',
    cover: 'https://example.com/cover.jpg',
  },
};

const MOCK_TRACK = {
  id: 3135556,
  title: 'Lose Yourself',
  link: 'https://www.deezer.com/track/3135556',
  preview: 'https://example.com/preview.mp3',
  duration: 326,
  artist: {
    id: 13,
    name: 'Eminem',
    link: 'https://www.deezer.com/artist/13',
  },
  album: {
    id: 302127,
    title: '8 Mile',
    cover: 'https://example.com/cover.jpg',
  },
};

function mockJsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('Songs (e2e)', () => {
  let app: INestApplication;
  let session: IE2eLoginResult;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    app = await createE2eApp();
    await deleteAdminsByUsernames(app, [ADMIN.username]);
    await deleteAllSongs(app);
    await upsertAdmin(app, ADMIN);
    session = await loginAs(app, ADMIN);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await deleteAllSongs(app);
    await deleteAdminsByUsernames(app, [ADMIN.username]);
    await app.close();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Favorite endpoint should 404 when the table is empty
  it('GET /api/songs/favorite should return 404 when no song is stored', async () => {
    await deleteAllSongs(app);

    const response = await http(app).get('/api/songs/favorite');

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(SONGS_MESSAGES.SONG_NOT_FOUND);
  });

  // Favorite endpoint should return the stored song
  it('GET /api/songs/favorite should return the stored song', async () => {
    await deleteAllSongs(app);
    const song = await insertSong(app);

    const response = await http(app).get('/api/songs/favorite');

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: SONGS_MESSAGES.SONG_FOUND,
      data: containing({
        id: song.id,
        trackId: song.trackId,
        trackName: song.trackName,
        albumName: song.albumName,
        durationMs: song.durationMs,
      }),
    });
  });

  // Search requires authentication
  it('GET /api/songs/search should return 401 without a token', async () => {
    const response = await http(app).get('/api/songs/search?query=queen');

    expect(response.status).toBe(401);
  });

  // Search requires a query term
  it('GET /api/songs/search should return 400 without a query', async () => {
    const response = await http(app)
      .get('/api/songs/search')
      .set(bearer(session.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El término de búsqueda es requerido']),
    );
  });

  // Search should map a mocked Deezer payload
  it('GET /api/songs/search should return mocked Deezer results', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(200, { data: [MOCK_SEARCH_ITEM] }),
      ) as typeof fetch;

    const response = await http(app)
      .get('/api/songs/search?query=queen')
      .set(bearer(session.accessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toEqual({
      status: 'ok',
      message: SONGS_MESSAGES.SEARCH_SUCCESS,
      data: [
        {
          id: MOCK_SEARCH_ITEM.id,
          title: MOCK_SEARCH_ITEM.title,
          link: MOCK_SEARCH_ITEM.link,
          preview: MOCK_SEARCH_ITEM.preview,
          duration: MOCK_SEARCH_ITEM.duration,
          artist: MOCK_SEARCH_ITEM.artist,
          album: MOCK_SEARCH_ITEM.album,
        },
      ],
    });
  });

  // Deezer failures should surface as 500
  it('GET /api/songs/search should return 500 when Deezer fails', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(502, { error: 'bad gateway' }),
      ) as typeof fetch;

    try {
      const response = await http(app)
        .get('/api/songs/search?query=queen')
        .set(bearer(session.accessToken));

      expect(response.status).toBe(500);
      expect(body(response).message).toBe(
        'No se pudo realizar la búsqueda en Deezer',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  // Saving a favorite requires authentication
  it('POST /api/songs/favorite should return 401 without a token', async () => {
    const response = await http(app)
      .post('/api/songs/favorite')
      .send({ trackId: '3135556' });

    expect(response.status).toBe(401);
  });

  // Saving a favorite requires a body
  it('POST /api/songs/favorite should return 400 without a body', async () => {
    const response = await http(app)
      .post('/api/songs/favorite')
      .set(bearer(session.accessToken));

    expect(response.status).toBe(400);
    expect(body(response).message).toEqual(
      expect.arrayContaining(['El ID del track es requerido']),
    );
  });

  // Missing Deezer tracks should return 404
  it('POST /api/songs/favorite should return 404 when Deezer track is missing', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockJsonResponse(404, {})) as typeof fetch;

    const response = await http(app)
      .post('/api/songs/favorite')
      .set(bearer(session.accessToken))
      .send({ trackId: '999999' });

    expect(response.status).toBe(404);
    expect(body(response).message).toBe(
      'Canción con id 999999 no encontrada en Deezer',
    );
  });

  // Saving a track should persist it and make it available publicly
  it('POST /api/songs/favorite should save a mocked track', async () => {
    await deleteAllSongs(app);
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockJsonResponse(200, MOCK_TRACK)) as typeof fetch;

    const response = await http(app)
      .post('/api/songs/favorite')
      .set(bearer(session.accessToken))
      .send({ trackId: '3135556' });

    expect(response.status).toBe(201);
    expect(body(response)).toEqual({
      status: 'ok',
      message: SONGS_MESSAGES.SONG_SAVED,
      data: containing({
        trackId: '3135556',
        trackName: MOCK_TRACK.title,
        albumName: MOCK_TRACK.album.title,
        durationMs: MOCK_TRACK.duration * 1000,
      }),
    });

    const favorite = await http(app).get('/api/songs/favorite');

    expect(favorite.status).toBe(200);
    expect(body<{ trackId: string }>(favorite).data.trackId).toBe('3135556');
  });
});
