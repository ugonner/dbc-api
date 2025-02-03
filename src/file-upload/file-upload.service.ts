import { Injectable } from '@nestjs/common';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as toStream from 'buffer-to-stream';
import { IMessageAttachment } from '../shared/interfaces/talkables/chat';
import { UploadApiResponse, v2 } from 'cloudinary';

@Injectable()
export class FileUploadService {
  private awsS3Bucket = process.env.AWS_BUCKET || 'ugonnatalk';

  async uploadMessageAttachmentToLocal(file: {
    buffer: Buffer;
    type: string;
  }): Promise<IMessageAttachment> {
    const attachmentUrl = `/talkables/message-attachments/${Date.now()}.wav`;
    const filePath = path.join(__dirname, '..', '..', 'public', attachmentUrl);
    fs.writeFileSync(filePath, file.buffer);
    await new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) reject(err);
        resolve(attachmentUrl);
      });
    });
    const attachmentData: IMessageAttachment = {
      attachmentUrl,
      attachmentType: /video/i.test(file.type) ? 'video' : 'audio',
    };
    return attachmentData;
  }

  async uploadMessageAttachmentToS3(file: {
    buffer: Buffer;
    type: string;
  }): Promise<IMessageAttachment> {
    const awsAccessKey =
      process.env.NODE_ENV === 'production'
        ? process.env.AWS_ACCESS_KEY_EC2
        : process.env.AWS_ACCESS_KEY_LOCAL;
    const awsSecreatAccessKey =
      process.env.NODE_ENV === 'production'
        ? process.env.AWS_SECRET_ACCESS_KEY_EC2
        : process.env.AWS_SECRET_ACCESS_KEY_LOCAL;
    const awsBucket = process.env.AWS_BUCKET;
    const awsRegion = process.env.AWS_REGION || 'eu-north-1';
    const s3 = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecreatAccessKey,
      },
    });

    const fileStream = toStream(file.buffer);
    const attachmentType = /video/i.test(file.type) ? 'video' : 'audio';
    const key = `${Date.now()}-${attachmentType}.wav`;

    const uploadParams = {
      Bucket: awsBucket,
      Key: key,
      Body: fileStream,
      ContentType: attachmentType,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const attachmentUrl = `https://${this.awsS3Bucket}.s3.${awsRegion}.amazonaws.com/${key}`;
    return {
      attachmentType,
      attachmentUrl,
    };
  }
  async uploadMessageAttachmentToCloudinary(file: {
    buffer: Buffer;
    type: string;
  }): Promise<IMessageAttachment> {
    
    const cloudinaryApiKey =
      process.env.NODE_ENV === 'production'
        ? process.env.CLOUDINARY_API_KEY
        : process.env.CLOUDINARY_API_KEY;
    const cloudinaryApiKeySecret =
      process.env.NODE_ENV === 'production'
        ? process.env.CLOUDINARY_API_SECRET
        : process.env.CLOUDINARY_API_SECRET;

    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const awsRegion = process.env.AWS_REGION || 'eu-north-1';
    const cloudinaryV2 = v2;
    cloudinaryV2.config({
      api_key: cloudinaryApiKey,
      api_secret: cloudinaryApiKeySecret,
      cloud_name: cloudinaryCloudName
    });
    

    const fileStream = toStream(file.buffer);
    const attachmentType = /video/i.test(file.type) ? 'video' : 'audio';
    const key = `${Date.now()}-${attachmentType}.wav`;

    const uploadStreamPromise: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinaryV2.uploader.upload_stream({
        resource_type: "auto"
      }, (err, result) => {
        if(err) reject(err);
        resolve(result)
      });
      fileStream.pipe(uploadStream);
    });
    return {
      attachmentType,
      attachmentUrl: uploadStreamPromise.secure_url
    }

    

    const attachmentUrl = `https://${this.awsS3Bucket}.s3.${awsRegion}.amazonaws.com/${key}`;
    return {
      attachmentType,
      attachmentUrl,
    };
  }

  
}
