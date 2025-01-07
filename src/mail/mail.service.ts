import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { MailDTO } from '../shared/dtos/mail.dto';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) {}

  async sendEmail(
    dto: MailDTO
  ) {
    try {
      const {to, subject, context, template} = dto;
      await this.mailerService.sendMail({
        to,
        subject,
        template, // e.g., './welcome' -> './templates/welcome.hbs'
        context, // Data to be injected into the template
      });
      console.log('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

}
