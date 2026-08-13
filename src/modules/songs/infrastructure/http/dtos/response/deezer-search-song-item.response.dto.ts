import { ApiProperty } from '@nestjs/swagger';
import type { IDeezerSearchSongItem } from '../../../../application/use-cases/search-songs/search-songs.use-case';

export class DeezerSearchArtistResponseDto {
  @ApiProperty({ description: 'ID del artista en Deezer', example: 13 })
  id: number;

  @ApiProperty({ description: 'Nombre del artista', example: 'Eminem' })
  name: string;

  @ApiProperty({
    description: 'URL del artista en Deezer',
    example: 'https://www.deezer.com/artist/13',
  })
  link: string;
}

export class DeezerSearchAlbumResponseDto {
  @ApiProperty({ description: 'ID del álbum en Deezer', example: 302127 })
  id: number;

  @ApiProperty({ description: 'Nombre del álbum', example: '8 Mile' })
  title: string;

  @ApiProperty({
    description: 'URL de la portada del álbum (250x250)',
    example: 'https://cdns-images.dzcdn.net/images/cover/.../250x250-000000-80-0-0.jpg',
  })
  cover: string;
}

export class DeezerSearchSongItemResponseDto {
  @ApiProperty({ description: 'ID del track en Deezer', example: 3135556 })
  id: number;

  @ApiProperty({ description: 'Nombre del track', example: 'Lose Yourself' })
  title: string;

  @ApiProperty({
    description: 'Artista del track',
    type: DeezerSearchArtistResponseDto,
  })
  artist: DeezerSearchArtistResponseDto;

  @ApiProperty({
    description: 'Álbum del track',
    type: DeezerSearchAlbumResponseDto,
  })
  album: DeezerSearchAlbumResponseDto;

  @ApiProperty({
    description: 'URL del track en Deezer',
    example: 'https://www.deezer.com/track/3135556',
  })
  link: string;

  @ApiProperty({
    description: 'URL de preview del track (30 segundos)',
    example: 'https://cdns-preview-....dzcdn.net/stream/...mp3',
    nullable: true,
  })
  preview: string | null;

  @ApiProperty({ description: 'Duración del track en segundos', example: 326 })
  duration: number;

  static fromDeezer(item: IDeezerSearchSongItem): DeezerSearchSongItemResponseDto {
    const dto = new DeezerSearchSongItemResponseDto();
    dto.id = item.id;
    dto.title = item.title;
    dto.artist = {
      id: item.artist.id,
      name: item.artist.name,
      link: item.artist.link,
    };
    dto.album = {
      id: item.album.id,
      title: item.album.title,
      cover: item.album.cover,
    };
    dto.link = item.link;
    dto.preview = item.preview;
    dto.duration = item.duration;
    return dto;
  }
}
