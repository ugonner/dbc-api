import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPhoneNumber,
    Length,
  } from 'class-validator';
import { QueryRequestDTO } from './query-request.dto';
  
  export class AuthDTO {
  
    @ApiPropertyOptional()
    @IsEmail({}, { message: 'Please enter a valid email address' })
    @IsOptional()
    email: string;

    @ApiPropertyOptional()
    @Length(11, 16)
    @IsPhoneNumber()
    @IsOptional()
    phoneNumber?: string;
  
  
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
    email?: string;

    @ApiPropertyOptional()
    @Length(11, 16)
    @IsPhoneNumber()
    @IsOptional()
    phoneNumber?: string;
  
    @ApiPropertyOptional()
    @Length(8, 20, { message: 'Password must be between 8 and 20 characters' })
    @IsOptional()
    password?: string;
    
  }

  export class QueryAuthDTO extends QueryRequestDTO {}
  