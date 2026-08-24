import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetFavoriteSongUseCase } from './application/use-cases/get-first-song/get-favorite-song.use-case';
import { SaveSongUseCase } from './application/use-cases/save-song/save-song.use-case';
import { SearchSongsUseCase } from './application/use-cases/search-songs/search-songs.use-case';
import { SONG_REPOSITORY } from './domain/repositories/song.repository.interface';
import { SongsController } from './infrastructure/http/songs.controller';
import { SongRepositoryImpl } from './infrastructure/persistence/song.repository.impl';
import { SongTypeOrmEntity } from './infrastructure/persistence/typeorm/song.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([SongTypeOrmEntity])],
  controllers: [SongsController],
  providers: [
    {
      provide: SONG_REPOSITORY,
      useClass: SongRepositoryImpl,
    },
    SearchSongsUseCase,
    SaveSongUseCase,
    GetFavoriteSongUseCase,
  ],
})
export class SongsModule {}
