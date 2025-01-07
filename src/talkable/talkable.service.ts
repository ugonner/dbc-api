import { Inject, Injectable } from '@nestjs/common';
import { TalkableGateway } from './talkable.gateway';

@Injectable()
export class TalkableService {
    constructor(
        @Inject("TALKABLE_GATEWAY")
        private talkableGateway: TalkableGateway
    ){}
}
