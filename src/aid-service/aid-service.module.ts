import { Module } from '@nestjs/common';
import { AidServiceService } from './aid-service.service';
import { AidServiceController } from './aid-service.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule
  ],
  providers: [AidServiceService],
  controllers: [AidServiceController]
})
export class AidServiceModule {}
