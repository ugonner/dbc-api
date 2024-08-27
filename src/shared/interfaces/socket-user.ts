import MediaSoup from "mediasoup";
export interface IUserConnectionDetail {
  userId?: string;
  socketId?: string;
  room?: string;
  producerTransport?: MediaSoup.types.Transport;
  consumerTransport?: MediaSoup.types.Transport;
  producerTransportId?: string;
  consumerTransportId?: string;
  producerId?: string;
  consumerId?: string;
  producer?: MediaSoup.types.Producer;
  consumer?: MediaSoup.types.Consumer;
  isAdmin?: boolean;
  isPublishing?: boolean;
  isOwner?: boolean;
}

export interface ISocketUser {
  [socketId: string]: IUserConnectionDetail
}
