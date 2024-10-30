import MediaSoup from "mediasoup";

export class JoinRoomDTO {
    userId: string;
    room: string;
}

export class getRouterRTCCapabilitiesDTO{
    room: string;
}
export class createTransportDTO {
    isProducer: boolean;
    room: string;
}

export class ConnectTransportDTO {
    dtlsParameters: MediaSoup.types.DtlsParameters;
    transportId: string;
    room: string;
    isProducer: boolean;
}

export class CreateProducerDTO{
    rtpParameters: MediaSoup.types.RtpParameters;
    kind: MediaSoup.types.MediaKind;
    transportId: string;
    room: string;
    mediaKind: "audio" | "video";
    isAudioTurnedOff: boolean;
    isVideoTurnedOff: boolean;
}

export class CreateConsumerDTO {
    rtpCapabilities: MediaSoup.types.RtpCapabilities;
    producerId: string;
    transportId: string;
    room: string;
}

export class ProducingDTO{
    producerId: string;
    userId: string;
}

export class PublishProducerDTO{
    producerId: string;
    userId: string;
    room: string;
    socketId?: string;
    
}


