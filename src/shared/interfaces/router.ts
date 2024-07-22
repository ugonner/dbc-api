import MediaSoup from 'mediasoup';
export interface IRouterProps {
  router?: MediaSoup.types.Router;
  transports?: ({
    transportId: string;
    transport: MediaSoup.types.Transport;
  })[];
  producers?: {
    producerId: string;
    producer: MediaSoup.types.Producer;
  }[];
  consumers?: {
    consumerId: string;
    consumer: MediaSoup.types.Consumer;
  }[]
}
