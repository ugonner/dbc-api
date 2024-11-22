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
  PublishProducerDTO,
} from '../shared/dtos/requests/signals';
import { CodecCapabilities } from '../shared/DATASETS/codec-capabilities';
import { EventUtility } from './event-utility';
import {
  IProducerUser,
  ISocketUser,
  IUserConnectionDetail,
} from '../shared/interfaces/socket-user';
import { ClientEvents, BroadcastEvents } from '../shared/enums/events.enum';
import {
  CreatedConsumerDTO,
  CreatedTransportDTO,
  IProducersDTO,
  ToggleProducerStateDTO,
  UserReactionDTO,
} from '../shared/dtos/responses/signals';
import { IRouterProps } from '../shared/interfaces/router';
import {
  forwardRef,
  Inject,
  Injectable,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseInterceptor } from '../shared/interceptors/response.interceptor';
import { ApiResponse, IApiResponse } from '../shared/helpers/apiresponse';
import { EventExceptionHandler } from '../shared/interceptors/exception.filter';
import { error } from 'console';
import { RoomService } from './room.service';

@UseFilters(EventExceptionHandler)
@UseInterceptors(ResponseInterceptor)
@WebSocketGateway({
  namespace: '/call',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class CallGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  getServer(): Server {
    return this.server;
  }

  private roomsUsers: { [room: string]: ISocketUser } = {};

  private worker: MediaSoup.types.Worker;
  private roomRouters: { [room: string]: IRouterProps } = {};

  public getRoomUsers(): { [room: string]: ISocketUser } {
    return this.roomsUsers;
  }

  constructor(
    @Inject(forwardRef(() => RoomService))
    private roomService: RoomService,
  ) {}

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
    if (this.roomsUsers) delete this.roomsUsers[client.id];
  }

  @SubscribeMessage(BroadcastEvents.PRODUCER_CLOSED)
  handleClosedProducer(client: Socket) {
    this.notifyAndDeleteClosedProducers(client);
  }

  @SubscribeMessage(ClientEvents.JOIN_ROOM)
  async joinRoom(client: Socket, payload: JoinRoomDTO) {
    const { room, userId, userName, avatar } = payload;
    const socketId: string = client.id;
    if (!this.roomRouters[room] || !this.roomRouters[room]?.router) {
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

    const dbRoom = await this.roomService.getRoom(room);
    const isOwner = dbRoom?.owner?.userId === userId;
    this.updateRoomSocketUser(room, socketId, {
      userId,
      userName,
      avatar,
      room,
      socketId,
      isOwner,
      isAdmin: isOwner,
    });
    client.join(room);
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
    const { producerTransport } =
      this.getSocketConnectiondATA(client.id, room);
    if (producerTransport) {
      const producer = await producerTransport.produce({ kind, rtpParameters });
      let socketUserPayload: IUserConnectionDetail = {};
      socketUserPayload.isVideoTurnedOff = dto.isVideoTurnedOff;
      socketUserPayload.isAudioTurnedOff = dto.isAudioTurnedOff;
      if (/audio/i.test(dto.mediaKind)) {
        socketUserPayload = {
          ...socketUserPayload,
          audiooProducer: producer,
          audioProducerId: producer.id,
          isAudioTurnedOff: false,
        };
      } else if (/video/i.test(dto.mediaKind)) {
        socketUserPayload = {
          ...socketUserPayload,
          videoProducer: producer,
          videoProducerId: producer.id,
          isVideoTurnedOff: false,
        };
      }
      this.updateRoomSocketUser(room, client.id, socketUserPayload);

      const producerDto: IProducerUser = this.getProducerDTOFromSocket(
        client.id,
        room,
      );

      client.to(room).emit(BroadcastEvents.PRODUCER_PRODUCING, producerDto);
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
      const {
        socketId,
        videoProducerId,
        audioProducerId,
        userId,
        isVideoTurnedOff,
        isAudioTurnedOff,
      } = socketUser;
      const producerId = videoProducerId || audioProducerId;
      if (producerId && client.id !== socketId) {
        producers[socketId] = {
          videoProducerId,
          audioProducerId,
          userId,
          socketId,
          isVideoTurnedOff,
          isAudioTurnedOff,
        };
      }
    });
    return ApiResponse.success(
      'Room producers fetched successfully',
      producers,
    );
  }

  @SubscribeMessage(ClientEvents.GET_ROOM_ADMINS)
  async getRoomAdmins(
    client: Socket,
    payload: { room: string },
  ): Promise<IApiResponse<IProducersDTO>> {
    const roomSockets = this.roomsUsers[payload.room];
    if (!roomSockets) {
      const room = await this.roomService.getRoom(payload.room);
      const roomAdmin = {
        [client.id]: { userId: room.owner?.userId },
      } as unknown as IProducersDTO;
      return ApiResponse.success('admins fetched', roomAdmin);
    }
    const socketUsers: IUserConnectionDetail[] = Object.values(roomSockets);
    const producers: IProducersDTO = {};
    socketUsers.forEach((socketUser) => {
      const {
        socketId,
        videoProducerId,
        audioProducerId,
        userId,
        isVideoTurnedOff,
        isAudioTurnedOff,
        isAdmin,
      } = socketUser;
      if (isAdmin) {
        producers[socketId] = {
          videoProducerId,
          audioProducerId,
          userId,
          socketId,
          isVideoTurnedOff,
          isAudioTurnedOff,
        };
      }
    });
    return ApiResponse.success('Room admins fetched successfully', producers);
  }

  @SubscribeMessage(BroadcastEvents.REQUEST_TO_JOIN)
  async requestTojOIN(
    client: Socket,
    payload: JoinRoomDTO,
  ): Promise<IApiResponse<boolean>> {
    try {
      const { room } = payload;
      const roomAdmins = await (
        await this.getRoomAdmins(client, { room })
      ).data;
      //-- If no admin is connected ie no socketId throw;
      const availableAdmin = Object.values(roomAdmins)[0];
      if (!availableAdmin.socketId)
        return ApiResponse.fail('No admin is connected yet', false);

      this.server
        .to(availableAdmin.socketId)
        .emit(BroadcastEvents.REQUEST_TO_JOIN, {
          room,
          socketId: client.id,
          ...payload,
        });
      return ApiResponse.success('Request to publish successful', true);
    } catch (errror) {
      return ApiResponse.fail((error as any).message, false);
    }
  }

  @SubscribeMessage(BroadcastEvents.JOIN_REQUEST_ACCEPTED)
  async acceptJoinRequest(
    client: Socket,
    payload: PublishProducerDTO,
  ): Promise<IApiResponse<PublishProducerDTO>> {
    try {
      console.log('fired accepted');
      const { socketId, room } = payload;

      client.to(socketId).emit(BroadcastEvents.JOIN_REQUEST_ACCEPTED, payload);
      return ApiResponse.success('Producer published successfully', payload);
    } catch (errror) {
      return ApiResponse.fail(
        (error as any).message,
        error as unknown as PublishProducerDTO,
      );
    }
  }

  @SubscribeMessage(BroadcastEvents.JOIN_REQUEST_REJECTED)
  async rejectJoinRequest(
    client: Socket,
    payload: PublishProducerDTO,
  ): Promise<IApiResponse<PublishProducerDTO>> {
    try {
      console.log('fired rejected');
      const { socketId, room } = payload;

      client.to(socketId).emit(BroadcastEvents.JOIN_REQUEST_REJECTED, payload);
      return ApiResponse.success('Producer rejected successfully', payload);
    } catch (errror) {
      return ApiResponse.fail(
        (error as any).message,
        error as unknown as PublishProducerDTO,
      );
    }
  }

  @SubscribeMessage(BroadcastEvents.USER_REACTION)
  async setUserReaction(client: Socket, payload: UserReactionDTO) {
    try {
      const { room, action } = payload;
      const socketId = payload.socketId || client.id;
      const userConnectionDetails = this.roomsUsers[room][socketId] || {};
      const previousActionState = userConnectionDetails[action];
      const currentActionState = previousActionState ? false : true;
      this.updateRoomSocketUser(room, socketId, {
        [action]: currentActionState,
      });
      const producerDto = this.getProducerDTOFromSocket(socketId, room);
      client.to(room).emit(BroadcastEvents.USER_REACTION, {...producerDto, action});
      return ApiResponse.success("user reaction emitted successfully", producerDto)
    } catch (error) {
      console.log('Error toggling producermode', error.message);
      return ApiResponse.fail("error handling user reaction", error.message)
    }
  }
  @SubscribeMessage(BroadcastEvents.TOGGLE_PRODUCER_STATE)
  async toggleProducerState(client: Socket, payload: ToggleProducerStateDTO) {
    try {
      const { room, action } = payload;
      const socketId = payload.socketId || client.id;
      let {
        isAudioTurnedOff,
        isVideoTurnedOff,
        audiooProducer,
        videoProducer,
      } = this.roomsUsers[room][socketId] || {};
      const eventPayload = { ...payload, socketId };

      if (action === 'mute') {
        await audiooProducer?.pause();
        isAudioTurnedOff = true;
      } else if (action === 'unMute') {
        await audiooProducer?.resume();
        isAudioTurnedOff = false;
      } else if (action === 'turnOffVideo') {
        await videoProducer?.pause();
        isVideoTurnedOff = true;
      } else if (action === 'turnOnVideo') {
        await videoProducer?.resume();
        isVideoTurnedOff = false;
      }
      this.updateRoomSocketUser(room, socketId, {
        isVideoTurnedOff,
        isAudioTurnedOff,
      });
      const producerDto = this.getProducerDTOFromSocket(socketId, room);
      client.to(room).emit(BroadcastEvents.TOGGLE_PRODUCER_STATE, producerDto);
    } catch (error) {
      console.log('Error toggling producermode', error.message);
    }
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
    const disconnectingSocket: IUserConnectionDetail = allSockets.find(
      (socketObj: ISocketUser) => socketObj[client.id],
    );
    if (!disconnectingSocket) return;
    const { socketId, userId, room } = disconnectingSocket[client.id];
    if (this.roomsUsers[room] && this.roomsUsers[room][client.id]) {
      delete this.roomsUsers[room][client.id];
    }

    const producerDto: IProducerUser = this.getProducerDTOFromSocket(
      socketId,
      room,
    );
    this.server.to(room).emit(BroadcastEvents.PRODUCER_CLOSED, producerDto);
  }

  getProducerDTOFromSocket(socketId: string, room: string): IProducerUser {
    let producingDto: IProducerUser;
    const socketUser = this.roomsUsers[room]
      ? this.roomsUsers[room][socketId]
      : null;
    if (socketUser) {
      producingDto = {
        isAudioTurnedOff: socketUser.isAudioTurnedOff,
        isVideoTurnedOff: socketUser.isVideoTurnedOff,
        videoProducerId: socketUser.videoProducerId,
        audioProducerId: socketUser.audioProducerId,
        socketId,
        userId: socketUser.userId,
        userName: socketUser.userName,
        avatar: socketUser.avatar,

        // USER REACTIONS
        raizingHand: socketUser.raizingHand,
        clapping: socketUser.clapping,
        laughing: socketUser.laughing,
        angry: socketUser.angry,
        indifferent: socketUser.indifferent,
        happy: socketUser.happy,
        agreeing: socketUser.agreeing,
        disagreeing: socketUser.disagreeing,
      }

      return producingDto;
    }
  }
}
