import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotifyTrackTypeOrmEntity } from './infrastructure/persistence/typeorm/spotify-track.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpotifyTrackTypeOrmEntity])],
  exports: [TypeOrmModule],
})
export class SpotifyModule {}
