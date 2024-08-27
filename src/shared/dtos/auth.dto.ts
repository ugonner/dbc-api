import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    Length,
  } from 'class-validator';
  
  export class AuthDTO {
  
    @ApiProperty()
    @IsEmail({}, { message: 'Please enter a valid email address' })
    email: string;
  
    @ApiProperty()
    @Length(8, 20, { message: 'Password must be between 8 and 20 characters' })
    @IsNotEmpty({ message: 'Please enter a password' })
    password: string;
  
  }


  export class OtpAuthDTO {
    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    otp?: number;

    @ApiPropertyOptional()
    @IsEmail({}, { message: 'Please enter a valid email address' })
    @IsOptional()
    email: string;
  
    @ApiPropertyOptional()
    @Length(8, 20, { message: 'Password must be between 8 and 20 characters' })
    @IsOptional()
    password?: string;
    
  }
  