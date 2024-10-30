import MediaSoup from "mediasoup";
export interface IUserConnectionDetail {
  userId?: string;
  socketId?: string;
  room?: string;
  producerTransport?: MediaSoup.types.Transport;
  consumerTransport?: MediaSoup.types.Transport;
  producerTransportId?: string;
  consumerTransportId?: string;
  consumerId?: string;
  videoProducerId?: string;
  audioProducerId?: string;
  videoProducer?: MediaSoup.types.Producer;
  audiooProducer?: MediaSoup.types.Producer;
  consumer?: MediaSoup.types.Consumer;
  isAdmin?: boolean;
  isPublishing?: boolean;
  isOwner?: boolean;
  isVideoTurnedOff?: boolean,
  isAudioTurnedOff?: boolean,
}

export interface ISocketUser {
  [socketId: string]: IUserConnectionDetail
}
export interface IProducerUser {
  userId?: string;
  videoProducerId: string;
  audioProducerId: string;
  socketId: string;
  isAudioTurnedOff: boolean;
  isVideoTurnedOff: boolean;
  userName?: string;
  mediaStream?: MediaStream;
}
