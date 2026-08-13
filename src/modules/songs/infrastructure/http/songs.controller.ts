import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../../../../common/dto/response/api-response.dto';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { SONGS_MESSAGES } from '../../application/constants/songs-messages.constants';
import { GetFirstSongUseCase } from '../../application/use-cases/get-first-song/get-first-song.use-case';
import { SaveSongUseCase } from '../../application/use-cases/save-song/save-song.use-case';
import { SearchSongsUseCase } from '../../application/use-cases/search-songs/search-songs.use-case';
import { SearchSongsRequestDto } from './dtos/request/search-songs.request.dto';
import { SaveSongRequestDto } from './dtos/request/save-song.request.dto';
import { DeezerSearchSongItemResponseDto } from './dtos/response/deezer-search-song-item.response.dto';
import { SongResponseDto } from './dtos/response/song.response.dto';

@ApiTags('Songs')
@Controller('songs')
export class SongsController {
  constructor(
    private readonly searchSongsUseCase: SearchSongsUseCase,
    private readonly saveSongUseCase: SaveSongUseCase,
    private readonly getFirstSongUseCase: GetFirstSongUseCase,
  ) {}

  @ApiOperation({
    summary: 'Buscar canciones en Deezer',
    description:
      'Busca canciones por nombre en la API de Deezer. Requiere autenticación.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Búsqueda realizada con éxito',
    type: [DeezerSearchSongItemResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(
    @Query() dto: SearchSongsRequestDto,
  ): Promise<ApiResponseDto<DeezerSearchSongItemResponseDto[]>> {
    const result = await this.searchSongsUseCase.execute(dto.query);

    return ApiResponseDto.ok(
      result.songs.map(DeezerSearchSongItemResponseDto.fromDeezer),
      SONGS_MESSAGES.SEARCH_SUCCESS,
    );
  }

  @ApiOperation({
    summary: 'Guardar canción en la base de datos',
    description:
      'Obtiene los datos de una canción desde Deezer y la persiste. Requiere autenticación.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: SaveSongRequestDto })
  @ApiOkResponse({
    description: 'Canción guardada con éxito',
    type: SongResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Canción no encontrada en Deezer' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @UseGuards(JwtAuthGuard)
  @Post('tracks')
  async saveSong(
    @Body() dto: SaveSongRequestDto,
  ): Promise<ApiResponseDto<SongResponseDto>> {
    const song = await this.saveSongUseCase.execute(dto.trackId);

    return ApiResponseDto.ok(
      SongResponseDto.fromDomain(song),
      SONGS_MESSAGES.SONG_SAVED,
    );
  }

  @ApiOperation({
    summary: 'Obtener la primera canción guardada',
    description:
      'Retorna la primera canción almacenada en la base de datos. Endpoint público.',
  })
  @ApiOkResponse({
    description: 'Canción obtenida con éxito',
    type: SongResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No hay ninguna canción guardada' })
  @Get('tracks/first')
  async getFirstSong(): Promise<ApiResponseDto<SongResponseDto>> {
    const song = await this.getFirstSongUseCase.execute();

    return ApiResponseDto.ok(
      SongResponseDto.fromDomain(song),
      SONGS_MESSAGES.SONG_FOUND,
    );
  }
}
