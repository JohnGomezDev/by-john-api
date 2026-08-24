import { ApiProperty } from '@nestjs/swagger';
import type { TArtist, Song } from '../../../../domain/entities/song.entity';

export class ArtistResponseDto {
  @ApiProperty({ description: 'ID del artista', example: '13' })
  id: string;

  @ApiProperty({ description: 'Nombre del artista', example: 'Eminem' })
  name: string;

  @ApiProperty({
    description: 'URL del artista',
    example: 'https://www.deezer.com/artist/13',
  })
  url: string;

  static fromDomain(artist: TArtist): ArtistResponseDto {
    const dto = new ArtistResponseDto();
    dto.id = artist.id;
    dto.name = artist.name;
    dto.url = artist.url;
    return dto;
  }
}

export class SongResponseDto {
  @ApiProperty({ description: 'ID interno del registro', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID del track en Deezer', example: '3135556' })
  trackId: string;

  @ApiProperty({ description: 'Nombre del track', example: 'Lose Yourself' })
  trackName: string;

  @ApiProperty({
    description: 'Artistas del track',
    type: [ArtistResponseDto],
  })
  artists: ArtistResponseDto[];

  @ApiProperty({ description: 'ID del álbum', example: '302127' })
  albumId: string;

  @ApiProperty({ description: 'Nombre del álbum', example: '8 Mile' })
  albumName: string;

  @ApiProperty({
    description: 'URL de la portada del álbum',
    example:
      'https://cdns-images.dzcdn.net/images/cover/.../250x250-000000-80-0-0.jpg',
  })
  albumCoverUrl: string;

  @ApiProperty({
    description: 'URL del track',
    example: 'https://www.deezer.com/track/3135556',
  })
  url: string;

  @ApiProperty({
    description: 'URL de preview del track',
    example: 'https://cdns-preview-....dzcdn.net/stream/...mp3',
    nullable: true,
  })
  previewUrl: string | null;

  @ApiProperty({
    description: 'Duración del track en milisegundos',
    example: 326000,
  })
  durationMs: number;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  updatedAt: Date;

  static fromDomain(song: Song): SongResponseDto {
    const dto = new SongResponseDto();
    dto.id = song.id!;
    dto.trackId = song.trackId;
    dto.trackName = song.trackName;
    dto.artists = song.artists.map((artist) =>
      ArtistResponseDto.fromDomain(artist),
    );
    dto.albumId = song.albumId;
    dto.albumName = song.albumName;
    dto.albumCoverUrl = song.albumCoverUrl;
    dto.url = song.url;
    dto.previewUrl = song.previewUrl;
    dto.durationMs = song.durationMs;
    dto.createdAt = song.createdAt;
    dto.updatedAt = song.updatedAt;
    return dto;
  }
}
