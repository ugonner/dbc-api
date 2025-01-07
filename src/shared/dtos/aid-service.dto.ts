import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, isNumberString, IsNumberString, IsOptional, isString, IsString } from "class-validator";

export class AidServiceDTO {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;



}

export class UpdateUserAidServiceDTO {
    @ApiProperty()
    @IsNumber()
    id: number

}

export class RequestAidServiceDTO {
    @ApiProperty()
    @IsNumber()
    id: number;

    @ApiProperty()
    @IsString()
    roomId: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;
}