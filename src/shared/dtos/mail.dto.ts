import { IsEmail, IsOptional, IsString } from "class-validator";

export class MailDTO {
    @IsEmail({})
    to: string;

    @IsString()
    subject: string;

    @IsString()
    @IsOptional()
    template?: string;


    @IsOptional()
    context?: Record<string, unknown>;
}