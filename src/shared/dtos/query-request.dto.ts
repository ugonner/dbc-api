import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumberString, IsOptional, IsString } from "class-validator";

export class QueryRequestDTO {
    @ApiPropertyOptional()
    @IsNumberString()
    @IsOptional()
    page?: string;
    @ApiPropertyOptional()
    @IsNumberString()
    @IsOptional()
    limit?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    searchTerm?: string;

    @ApiPropertyOptional()
    @IsEnum(["ASC", "DESC"], {message: `order must be one of "ASC" | "DESC"`})
    @IsOptional()
    order?: "ASC" | "DESC";

    

}