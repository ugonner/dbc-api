import MediaSoup from 'mediasoup';

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
    producerId: string;
    userId: string;
    name?: string;
}
export class IProducersDTO {
    [producerId: string]: IProducerUser
}