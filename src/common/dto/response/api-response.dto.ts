import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Datos de la respuesta' })
  data: T;

  @ApiProperty({ description: 'Estado de la respuesta', example: 'ok' })
  status: 'ok';

  @ApiProperty({
    description: 'Mensaje descriptivo de la operación',
    example: 'Operación exitosa',
  })
  message: string;

  static ok<T>(data: T, message = 'Operación exitosa'): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.data = data;
    response.status = 'ok';
    response.message = message;
    return response;
  }
}
