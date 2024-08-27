import { IsEnum, IsOptional, IsString } from "class-validator";
import { Gender } from "../enums/user.enum";
import { AuthDTO } from "./auth.dto";

export class UserProfileDTO extends AuthDTO{
    

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    avatar?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender

}