import { IsEnum, IsOptional, IsString } from "class-validator";
import { Gender } from "../enums/user.enum";
import { AuthDTO } from "./auth.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UserProfileDTO extends AuthDTO{
    

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    avatar?: string;

    @ApiPropertyOptional()
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender

}

export class UpdateProfileDTO {
    
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    avatar?: string;

    @ApiPropertyOptional()
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender
}