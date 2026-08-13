import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveSongRequestDto {
  @ApiProperty({
    description: 'ID del track en Deezer',
    example: '3135556',
  })
  @IsString()
  @IsNotEmpty({ message: 'El ID del track es requerido' })
  trackId: string;
}
