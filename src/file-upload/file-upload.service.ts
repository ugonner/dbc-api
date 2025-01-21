import { Injectable } from '@nestjs/common';
import { Express } from 'express';
import * as fs from "fs";
import * as path from "path";
import { Readable } from 'stream';

@Injectable()
export class FileUploadService {

    async createAudioFile(file: {buffer: Buffer, type: string}) {
        const attachmentUrl = `/talkables/message-attachments/${Date.now()}.wav`;
        const filePath = path.join(__dirname, "..", "..", "public", attachmentUrl)
        fs.writeFileSync(filePath, file.buffer);
        await new Promise((resolve, reject) => {
            fs.writeFile(filePath, file.buffer, (err) => {
                if(err) reject(err);
                resolve(attachmentUrl);
            } )
        });
        const attachmentData = {
            attachmentUrl,
            attachmentType: /video/i.test(file.type) ? "video" : "audio"
        }
        return attachmentData;
    }
}
