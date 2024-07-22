import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import MediaSoup, { createWorker } from 'mediasoup';
import { Server, Socket } from 'socket.io';
import {
  ConnectTransportDTO,
  CreateConsumerDTO,
  CreateProducerDTO,
  createTransportDTO,
  getRouterRTCCapabilitiesDTO,
  JoinRoomDTO,
  ProducingDTO,
} from '../shared/dtos/requests/signals';
import { CodecCapabilities } from '../shared/DATASETS/codec-capabilities';
import { EventUtility } from './event-utility';
import {
  ISocketUser,
  IUserConnectionDetail,
} from '../shared/interfaces/socket-user';
import { ClientEvents, ServerEvents } from '../shared/enums/events.enum';
import {
  CreatedConsumerDTO,
  CreatedTransportDTO,
  IProducersDTO,
} from '../shared/dtos/responses/signals';
import { IRouterProps } from '../shared/interfaces/router';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../shared/interceptors/response.interceptor';
import { ApiResponse, IApiResponse } from '../shared/helpers/apiresponse';
import { EventExceptionHandler } from '../shared/interceptors/exception.filter';

@UseFilters(EventExceptionHandler)
@UseInterceptors(ResponseInterceptor)
@WebSocketGateway({
  namespace: '/call',
  cors: {
    origin: '*',
  },
})
export class CallGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private roomsUsers: { [room: string]: ISocketUser } = {};

  private worker: MediaSoup.types.Worker;
  private roomRouters: { [room: string]: IRouterProps } = {};

  async afterInit() {
    this.worker = await createWorker();
    this.worker.on('died', () => {
      console.log('worker just died');
      process.exit(1);
    });
    this.roomRouters = {};
    this.roomsUsers = {};
    console.log('Gateway started');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    console.log('connected', client.id);
  }

  handleDisconnect(client: Socket) {
    this.notifyAndDeleteClosedProducers(client);
    delete this.roomsUsers[client.id];
  }

  @SubscribeMessage(ServerEvents.PRODUCER_CLOSED)
  handleClosedProducer(client: Socket) {
    this.notifyAndDeleteClosedProducers(client);
  }

  @SubscribeMessage(ClientEvents.JOIN_ROOM)
  async joinRoom(client: Socket, payload: JoinRoomDTO) {
    const { room, userId } = payload;
    const socketId: string = client.id;

    if (!this.roomRouters[room] || !this.roomRouters[room].router) {
      const router = await this.worker.createRouter({
        mediaCodecs: CodecCapabilities,
      });

      this.updateRoomRouter(room, router);

      EventUtility.AttachRouterEventHandlers(
        this.roomRouters[room].router,
        this.server,
        room,
      );
    }
    this.updateRoomSocketUser(room, socketId, { userId, room });
    client.join(room);
    console.log('joined room');
    return payload;
  }

  @SubscribeMessage(ClientEvents.GET_ROUTER_RTCCAPABILITIES)
  async getRouterRTCCapabilities(
    client: Socket,
    payload: getRouterRTCCapabilitiesDTO,
  ): Promise<IApiResponse<MediaSoup.types.RtpCapabilities>> {
    const res = this.roomRouters[payload.room].router.rtpCapabilities;
    return ApiResponse.success(
      'Router RTPcAPABILITIES  OBTAINED SUCCESSFULLY',
      res,
      200,
    );
  }

  @SubscribeMessage(ClientEvents.CREATE_TRANSPORT)
  async createTransport(
    client: Socket,
    payload: createTransportDTO,
  ): Promise<IApiResponse<CreatedTransportDTO>> {
    const { room, isProducer } = payload;
    const transport = await this.roomRouters[room].router.createWebRtcTransport(
      {
        listenIps: [{ ip: '127.0.0.1', announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      },
    );
    this.updateRoomSocketUser(
      room,
      client.id,
      isProducer
        ? { producerTransportId: transport.id, producerTransport: transport }
        : { consumerTransportId: transport.id, consumerTransport: transport },
    );
    const res = {
      id: transport?.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
    return ApiResponse.success('transport created sussessfully', res, 201);
  }

  @SubscribeMessage(ClientEvents.CONNECT_TRANSPORT)
  async connectTransport(
    client: Socket,
    payload: ConnectTransportDTO,
  ): Promise<IApiResponse<ConnectTransportDTO>> {
    if (!payload) return ApiResponse.fail('No payload passed', payload);

    const { room, dtlsParameters, isProducer } = payload;
    const socketId = client.id;

    const { consumerTransport, producerTransport } =
      this.getSocketConnectiondATA(socketId, room);

    const transport = isProducer ? producerTransport : consumerTransport;
    if (!transport) {
      return ApiResponse.fail('Connection Error: No transport found', payload);
    }
    await transport.connect({ dtlsParameters });
    return ApiResponse.success('Transport connected successfully', payload);
  }

  @SubscribeMessage(ClientEvents.PRODUCE)
  async produce(
    client: Socket,
    dto: CreateProducerDTO,
  ): Promise<IApiResponse<{ id: string }>> {
    const { room, rtpParameters, kind } = dto;
    const { producerTransport, userId } = this.getSocketConnectiondATA(
      client.id,
      room,
    );
    if (producerTransport) {
      const producer = await producerTransport.produce({ kind, rtpParameters });
      this.updateRoomSocketUser(room, client.id, {
        producer,
        producerId: producer.id,
      });

      const producingDto: ProducingDTO = { producerId: producer.id, userId };
      client.to(room).emit(ServerEvents.PRODUCER_PRODUCING, producingDto);
      return ApiResponse.success(
        'producer created successfully',
        { id: producer.id },
        201,
      );
    }
    return ApiResponse.fail('Unable to produce at server', {
      error: 'Server transport unable to produce',
    } as unknown as { id: string });
  }

  @SubscribeMessage(ClientEvents.CONSUME)
  async consome(
    client: Socket,
    dto: CreateConsumerDTO,
  ): Promise<IApiResponse<CreatedConsumerDTO>> {
    const { room, rtpCapabilities, producerId } = dto;
    const canConsume = this.roomRouters[room].router.canConsume({
      producerId,
      rtpCapabilities,
    });
    if (!canConsume) {
      return ApiResponse.fail(
        'something went wrong',
        'Unable to consume the producer',
      ) as unknown as IApiResponse<CreatedConsumerDTO>;
    }

    const { consumerTransport } = this.getSocketConnectiondATA(client.id, room);
    if (!consumerTransport) {
      return ApiResponse.fail(
        'No consumer transport found at server',
        'Unable to find corresponding transport',
        400,
      ) as unknown as IApiResponse<CreatedConsumerDTO>;
    }

    const consumer = await consumerTransport.consume({
      producerId,
      rtpCapabilities,
    });
    this.updateRoomSocketUser(room, client.id, {
      consumer,
      consumerId: consumer.id,
    });

    const res = {
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      id: consumer.id,
    };
    return ApiResponse.success('consumer created successfully', res, 201);
  }

  @SubscribeMessage(ClientEvents.GET_ROOM_PRODUCERS)
  async getRoomProducers(
    client: Socket,
    payload: { room: string },
  ): Promise<IApiResponse<IProducersDTO>> {
    const roomSockets = this.roomsUsers[payload.room];
    const socketUsers: IUserConnectionDetail[] = Object.values(roomSockets);
    const producers: IProducersDTO = {};
    socketUsers.forEach((socketUser) => {
      const { producerId, userId } = socketUser;
      if (producerId) producers[producerId] = { producerId, userId };
    });
    return ApiResponse.success(
      'Room producers fetched successfully',
      producers,
    );
  }

  private updateRoomSocketUser(
    room: string,
    socketId: string,
    dto: IUserConnectionDetail,
  ) {
    if (!this.roomsUsers[room]) {
      this.roomsUsers[room] = { [socketId]: dto };
    } else {
      const socketUser: IUserConnectionDetail =
        this.roomsUsers[room][socketId] || ({} as IUserConnectionDetail);
      this.roomsUsers[room][socketId] = { ...socketUser, ...dto };
    }
  }

  updateRoomRouter(room: string, router: MediaSoup.types.Router) {
    if (this.roomRouters[room]) this.roomRouters[room].router = router;
    else this.roomRouters[room] = { router };
  }

  private getSocketConnectiondATA(
    socketId: string,
    room: string,
  ): IUserConnectionDetail {
    return this.roomsUsers[room] ? this.roomsUsers[room][socketId] : {};
  }

  notifyAndDeleteClosedProducers(client: Socket) {
    const allSockets: ISocketUser[] = Object.values(this.roomsUsers);
    const disconnectingSocket: IUserConnectionDetail = allSockets.find((socketObj: ISocketUser) => socketObj[client.id]);
    if (!disconnectingSocket) {
      console.log('Unknown socket disconnected');
      return;
    }
    const { producerId, userId, room } = disconnectingSocket[client.id];
    if((this.roomsUsers[room] && this.roomsUsers[room][client.id]) && this.roomsUsers[room][client.id].producerId){
      delete this.roomsUsers[room][client.id].producer;
      delete this.roomsUsers[room][client.id].producerId;
   }
    
    console.log("Producer lett room::", room);
    this.server
      .to(room)
      .emit(ServerEvents.PRODUCER_CLOSED, { producerId, userId });
  }
}
