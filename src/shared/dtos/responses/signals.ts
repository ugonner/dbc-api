import MediaSoup from 'mediasoup';
import { UserReactions } from '../../interfaces/socket-user';

export class CreatedTransportDTO {
    id: string;
    iceParameters: MediaSoup.types.IceParameters;
    iceCandidates: MediaSoup.types.IceCandidate[];
    dtlsParameters: MediaSoup.types.DtlsParameters;
}

export class CreatedConsumerDTO {
    id: string;
    producerId: string;
    rtpParameters: MediaSoup.types.RtpParameters;
    kind: MediaSoup.types.MediaKind;
}
export class IProducerUser {
    videoProducerId: string;
    audioProducerId: string;
    userId: string;
    name?: string;
    socketId: string;
    isVideoTurnedOff: boolean; 
    isAudioTurnedOff: boolean;
}
export class IProducersDTO {
    [socketId: string]: IProducerUser
}

export class ToggleProducerStateDTO {
    room: string;
    action: "mute" | "unMute" | "turnOffVideo" | "turnOnVideo";
    socketId?: string;
}
export class UserReactionDTO {
    room: string;
    action: UserReactions;
    socketId?: string;
}