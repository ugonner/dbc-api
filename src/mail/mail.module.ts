import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { MailDTO } from '../shared/dtos/mail.dto';

@Module({
  providers: [MailService],
  exports: [MailService]
})
export class MailModule {}
