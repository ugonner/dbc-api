import MediaSoup from "mediasoup";
export interface IUserConnectionDetail extends IProducerUser {
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

}

export interface ISocketUser {
  [socketId: string]: IUserConnectionDetail
}
export interface IProducerUser extends IUserReactions {
  userId?: string;
  userName?: string;
  avatar?: string;
  videoProducerId?: string;
  audioProducerId?: string;
  socketId?: string;
  isAudioTurnedOff?: boolean;
  isVideoTurnedOff?: boolean;
  mediaStream?: MediaStream;
  
}

export interface IUserReactions {
  //USER REACTION
  
  raizingHand?: boolean;
  clapping?: boolean;
  laughing?: boolean;
  angry?: boolean;
  indifferent?: boolean;
  happy?: boolean;
  agreeing?: boolean;
  disagreeing?: boolean;
}

export enum UserReactions {
  RaizingHand = "raizingHand",
  Clapping = "clapping",
  Laughing = "laughing",
  Angry =  "angry",
  Indifferent = "indifferent",
  Happy = "happy",
  Agreeing = "agreeing",
  Disagreeing = "disagreeing" 
}