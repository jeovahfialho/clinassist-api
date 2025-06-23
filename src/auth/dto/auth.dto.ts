import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'joao@clinica.com.br' })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiProperty({ example: 'joao@clinica.com.br' })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @ApiProperty({ example: 'CRP-01/12345' })
  @IsString()
  @Matches(/^CRP-\d{2}\/\d{4,6}$/, {
    message: 'CRP deve ter o formato CRP-XX/XXXXX'
  })
  crp: string;

  @ApiProperty({ example: 'Psicologia Clínica', required: false })
  @IsString()
  specialty?: string;

  @ApiProperty({ example: '(11) 99999-9999', required: false })
  @IsString()
  phone?: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    name: string;
    email: string;
    crp: string;
    role: string;
  };
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
