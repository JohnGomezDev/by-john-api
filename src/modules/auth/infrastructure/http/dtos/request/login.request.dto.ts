import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'Nombre de usuario del administrador',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  username: string;

  @ApiProperty({
    description: 'Contraseña del administrador',
    example: 'S3cur3P@ssw0rd',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}
