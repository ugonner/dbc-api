import { Controller, Post, UploadedFile, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';
import { IMessageAttachment } from '../shared/interfaces/talkables/chat';

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
        let res: IMessageAttachment;
        if(/aws/i.test(process.env.STORAGE_PLATFORM)) res = await this.fileUploadService.uploadMessageAttachmentToS3(file);
        else if(/cloudinary/i.test(process.env.STORAGE_PLATFORM)) res = await this.fileUploadService.uploadMessageAttachmentToCloudinary(file);
        else res = await this.fileUploadService.uploadMessageAttachmentToLocal(file);
        
        return ApiResponse.success("file uploaded successfuly", res);
    }
}
