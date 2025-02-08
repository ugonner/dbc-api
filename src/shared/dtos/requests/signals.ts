import MediaSoup from "mediasoup";
import { IAccessibilityPreferences } from "../../interfaces/socket-user";
import { SctpStreamParameters } from "mediasoup/node/lib/fbs/sctp-parameters";
import { RoomAidType } from "../../enums/room.enum";

export class JoinRoomDTO {
    userId: string;
    room: string;
    userName?: string;
    avatar?: string;
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
    isAudioTurnedOff: boolean;
    isVideoTurnedOff: boolean;
    appData: {
        mediaKind: "audio" | "video" | "data";
        isScreenShare: boolean;
        isVideoTurnedOff: boolean;
        isAudioTurnedOff: boolean;
    }
}

export class CreateConsumerDTO {
    rtpCapabilities: MediaSoup.types.RtpCapabilities;
    producerId: string;
    transportId: string;
    room: string;
    appData: {
        mediaKind: "audio" | "video" | "data";
        isScreenShare: boolean;
    }
}


export interface CreateDataProducerDTO{
    sctpStreamParameters: SctpStreamParameters,
    label?: string;
    protocol?: string;
    appData: {
        mediaKind: "audio" | "video" | "data";
        isScreenShare: boolean;
    },
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

export class CloseMediaDTO {
    socketId?: string;
    mediaKind: "video" | "audio";
    isScreenSharing?: boolean;
    room?: string;
}
export class AccessibilityPreferenceDTO {
    room: string;
    socketId?: string;
    accessibilityPreferences: IAccessibilityPreferences;
  }

  export class ChatMessageDTO {
    room: string;
    socketId: string;
    message: string;
    usesTextualCommunication?: boolean;
  }

  
  export interface CaptionDTO {
    room: string;
    socketId?: string;
    deliveryTime?: Date;
    buffer?: ArrayBuffer;
    captionText?: string
  }

  export interface ICaptionText {
    partialResult?: string;
    finalResult?: string;
  }

  export interface RequestAidDTO {
    roomAidType: RoomAidType;
    room: string;
  }
  


