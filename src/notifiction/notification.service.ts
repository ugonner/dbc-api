import { Injectable, Logger } from '@nestjs/common';
import { IMail } from '../shared/interfaces/email.interface';

@Injectable()
export class NotificationService {
    
    async sendEmailWithIDs(userIds: string[], dto: IMail){
        (new Logger("sendEmailWithIds")).log(userIds, dto)    
    }
    
    async sendEmail(emails: string[], dto: IMail){
        (new Logger("SendMail").log(emails, dto))
    }
}
