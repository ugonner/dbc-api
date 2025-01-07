import { Module } from '@nestjs/common';
import { TalkableService } from './talkable.service';
import { TalkableGateway } from './talkable.gateway';
import { TalkableController } from './talkable.controller';

@Module({
  providers: [
    TalkableService,
    {
      provide: 'TALKABLE_GATEWAY',
      useClass: TalkableGateway,
    },
  ],
  controllers: [TalkableController],
})
export class TalkableModule {}
