import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchSongsRequestDto {
  @ApiProperty({
    description: 'Nombre de la canción a buscar',
    example: 'Bohemian Rhapsody',
  })
  @IsString()
  @IsNotEmpty({ message: 'El término de búsqueda es requerido' })
  query: string;
}
