import { Injectable, InternalServerErrorException } from '@nestjs/common';

const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';
const SEARCH_LIMIT = 8;

export interface IDeezerSearchArtist {
  id: number;
  name: string;
  link: string;
}

export interface IDeezerSearchAlbum {
  id: number;
  title: string;
  cover: string;
}

export interface IDeezerSearchSongItem {
  id: number;
  title: string;
  artist: IDeezerSearchArtist;
  album: IDeezerSearchAlbum;
  link: string;
  preview: string | null;
  duration: number;
}

export interface IDeezerSearchResult {
  songs: IDeezerSearchSongItem[];
}

interface IDeezerRawSearchSongItem {
  id: number;
  title: string;
  link: string;
  preview: string | null;
  duration: number;
  artist: {
    id: number;
    name: string;
    link: string;
  };
  album: {
    id: number;
    title: string;
    cover: string;
  };
}

interface IDeezerSearchApiResponse {
  data: IDeezerRawSearchSongItem[];
}

@Injectable()
export class SearchSongsUseCase {
  async execute(query: string): Promise<IDeezerSearchResult> {
    const params = new URLSearchParams({
      q: query,
      limit: String(SEARCH_LIMIT),
    });

    const response = await fetch(`${DEEZER_SEARCH_URL}?${params}`);

    if (!response.ok) {
      throw new InternalServerErrorException(
        'No se pudo realizar la búsqueda en Deezer',
      );
    }

    const data = (await response.json()) as IDeezerSearchApiResponse;

    return {
      songs: data.data.map((item) => ({
        id: item.id,
        title: item.title,
        link: item.link,
        preview: item.preview,
        duration: item.duration,
        artist: {
          id: item.artist.id,
          name: item.artist.name,
          link: item.artist.link,
        },
        album: {
          id: item.album.id,
          title: item.album.title,
          cover: item.album.cover,
        },
      })),
    };
  }
}
