import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional, IsArray } from "class-validator";

export class RoomDTO {
    @ApiProperty()
    @IsString()
    startTime: Date;
    
    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    duration?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    roomName?: string;

}
export class QueryRoomDTO {
    
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    startTime?: Date;
    
    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    duration?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    roomName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    participant?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    ownerId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    userId?: string;
    
    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    page: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    limit: number;
}

export class UpdateRoomInviteesDTO {
    @ApiProperty()
    @IsString()
    roomId: string;

    @ApiProperty()
    @IsArray()
    userPhonesOrEmailss: string[];

}