import { Controller, Post, UploadedFile, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';

@Controller('file-upload')
@UseFilters(AllExceptionFilter)
export class FileUploadController {
    constructor(
        private fileUploadService: FileUploadService
    ){}

    @Post()
    @UseInterceptors(FileInterceptor("file"))
    async createAudioFile(
        @UploadedFile() file: {buffer: Buffer, type: string}
    ){
        console.log("post upload", file.buffer)
        const res = await this.fileUploadService.createAudioFile(file);
        return ApiResponse.success("file uploaded successfuly", res);
    }
}
