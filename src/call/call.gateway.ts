import {
  MessageBody,
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
  AccessibilityPreferenceDTO,
  CaptionDTO,
  ChatMessageDTO,
  CloseMediaDTO,
  ConnectTransportDTO,
  CreateConsumerDTO,
  CreateDataProducerDTO,
  CreateProducerDTO,
  createTransportDTO,
  getRouterRTCCapabilitiesDTO,
  IConsumerReadyDTO,
  JoinRoomDTO,
  PublishProducerDTO,
  RequestAidDTO,
} from '../shared/dtos/requests/signals';
import { CodecCapabilities } from '../shared/DATASETS/codec-capabilities';
import { EventUtility } from './event-utility';
import {
  IAccessibilityPreferences,
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
  HttpStatus,
  Inject,
  Injectable,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseInterceptor } from '../shared/interceptors/response.interceptor';
import { ApiResponse, IApiResponse } from '../shared/helpers/apiresponse';
import { EventExceptionHandler } from '../shared/interceptors/exception.filter';
import { Console, error } from 'console';
import { RoomService } from './room.service';
import { IRoomContext } from '../shared/interfaces/room';

import * as path from 'path';
import { Transaction } from 'typeorm';
import {
  DataConsumer,
  DataConsumerOptions,
} from 'mediasoup/node/lib/DataConsumer';
import { Client } from 'socket.io/dist/client';
import {
  DataProducer,
  DataProducerOptions,
} from 'mediasoup/node/lib/DataProducer';
import { AidServiceService } from '../aid-service/aid-service.service';
import { PortRange } from 'mediasoup/node/lib/fbs/transport';

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
  private roomContexts: { [room: string]: IRoomContext } = {};

  private worker: MediaSoup.types.Worker;
  private roomRouters: { [room: string]: IRouterProps } = {};

  public getRoomUsers(): { [room: string]: ISocketUser } {
    return this.roomsUsers;
  }

  constructor(
    @Inject(forwardRef(() => RoomService))
    private roomService: RoomService,
  ) {}

  // private recognizeStream;

  async afterInit() {
    try {
      this.worker = await createWorker();
      this.worker.on('died', () => {
        console.log('worker just died');
        process.exit(1);
      });
      this.roomRouters = {};
      this.roomsUsers = {};

      console.log('Gateway started');
    } catch (error) {
      console.log('Error in AfterInit', error.message);
    }
  }

  async handleConnection(client: Socket, ...args: any[]) {
    console.log('connected', client.id);
  }

  async handleDisconnect(client: Socket) {
    await this.notifyAndDeleteClosedProducers(client);
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
      consumers: []
    });

    this.updateRoomContext(room, { sharerSocketId: '' });

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
    const privateIp =  process.env.PRIVATE_IP;
    const announcedIp = /prod/i.test(process.env.NODE_ENV) ? process.env.PUBLIC_IP : privateIp;
    const transport = await this.roomRouters[room].router.createWebRtcTransport(
      {
        //listenIps: [{ip: privateIp, announcedIp}],
        listenInfos: [
          {
            protocol: "udp",
            ip: privateIp,
            announcedAddress: announcedIp
          },
          {
            protocol: "tcp",
            ip: privateIp,
            announcedAddress: announcedIp
          }
        ],
        enableUdp: true,
        enableTcp: true,
        enableSctp: true,
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
      sctpParameters: transport.sctpParameters,
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
      this.getSocketUserConnectionDetail(socketId, room);

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
    const { room, rtpParameters, kind, ...dtoRest } = dto;
    const { producerTransport } = this.getSocketUserConnectionDetail(client.id, room);

    if (producerTransport) {
      const producer = await producerTransport.produce({ kind, rtpParameters, paused: true });
      let socketUserPayload: IUserConnectionDetail = {};
      
      if (dto.appData?.isScreenShare) {
        console.log('screen share produced');
        const roomContext: IRoomContext = {
          screenShareProducer: producer as MediaSoup.types.Producer,
          screenShareProducerId: producer.id,
          isSharing: true,
          sharerSocketId: client.id,
        };
        //clean up previouse sharing
        const roomPrevProducer = this.getRoomContext(room)?.screenShareProducer;
        roomPrevProducer?.close();

        this.updateRoomContext(room, roomContext);
      } else if (dto.appData?.mediaKind === 'audio') {
        socketUserPayload = {
          ...socketUserPayload,
          audiooProducer: producer as MediaSoup.types.Producer,
          audioProducerId: producer.id,
          isAudioTurnedOff: dto.appData?.isAudioTurnedOff ? true : false,
        };
        this.updateRoomSocketUser(room, client.id, socketUserPayload);
      } else if (dto.appData?.mediaKind === 'video') {
        socketUserPayload = {
          ...socketUserPayload,
          videoProducer: producer as MediaSoup.types.Producer,
          videoProducerId: producer.id,
          isVideoTurnedOff: dto.appData?.isVideoTurnedOff ? true : false,
        };
        this.updateRoomSocketUser(room, client.id, socketUserPayload);
      }

      const producerDto: IProducerUser = this.getProducerDTOFromSocket(
        client.id,
        room,
      );
     

      if (dto.appData?.isScreenShare) {
         const updatedRoomContext = await this.getRoomContext(room);
        client
          .to(room)
          .emit(BroadcastEvents.SCREEN_SHARING, updatedRoomContext);
      } else {
        client.to(room).emit(BroadcastEvents.PRODUCER_PRODUCING, producerDto);
      }
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

  @SubscribeMessage(ClientEvents.PRODUCE_DATA)
  async produceData(
    client: Socket,
    dto: CreateDataProducerDTO,
  ): Promise<IApiResponse<unknown>> {
    try {
      const { room, transportId, ...dataProducerOptions } = dto;
      const socketId = client.id;
      const { producerTransport } = this.getSocketUserConnectionDetail(
        client.id,
        room,
      );

      let dataProducer: DataProducer;
      if (producerTransport && dto.appData.mediaKind === 'data') {
        dataProducer = await producerTransport.produceData(
          dataProducerOptions as unknown as DataProducerOptions,
        );
        const socketUserPayload = {
          dataProducer: dataProducer as MediaSoup.types.DataProducer,
          dataProducerId: dataProducer.id,
        };

        this.updateRoomSocketUser(room, client.id, socketUserPayload);
        const producerDto = await this.getProducerDTOFromSocket(socketId, room);
        client
          .to(room)
          .emit(BroadcastEvents.PRODUCER_PRODUCING_DATA, producerDto);
        return ApiResponse.success(
          'producer created successfully',
          { id: dataProducer.id },
          201,
        );
      }
      return ApiResponse.fail('No Producer transport found', dataProducer);
    } catch (error) {
      return ApiResponse.fail(error.message, error);
    }
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
      console.log('can not consume', rtpCapabilities);
      return ApiResponse.fail(
        'something went wrong',
        'Unable to consume the producer',
      ) as unknown as IApiResponse<CreatedConsumerDTO>;
    }

    const { consumerTransport } = this.getSocketUserConnectionDetail(client.id, room);
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
      paused: true
    });
    const userConnectionDetail = await this.getSocketUserConnectionDetail(client.id, room);
    const consumers = (userConnectionDetail.consumers || []);
    consumers.push(consumer);
    this.updateRoomSocketUser(room, client.id, {
      consumers,
    });

    const res = {
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      id: consumer.id,
    };
    return ApiResponse.success('consumer created successfully', res, 201);
  }

  @SubscribeMessage(ClientEvents.CONSUME_DATA)
  async consomeData(
    client: Socket,
    dto: CreateConsumerDTO,
  ): Promise<IApiResponse<DataConsumerOptions>> {
    const { room, rtpCapabilities, producerId } = dto;

    const { consumerTransport } = this.getSocketUserConnectionDetail(client.id, room);
    if (!consumerTransport) {
      return ApiResponse.fail(
        'No consumer transport found at server',
        'Unable to find corresponding transport',
        400,
      ) as unknown as IApiResponse<DataConsumerOptions>;
    }

    const dataConsumer = await consumerTransport.consumeData({
      dataProducerId: producerId,
    });
    this.updateRoomSocketUser(room, client.id, {
      dataConsumer,
      dataConsumerId: dataConsumer.id,
    });

    const res: DataConsumerOptions = {
      dataProducerId: producerId,
    };
    return ApiResponse.success('Data consumer created successfully', res, 201);
  }

  @SubscribeMessage(BroadcastEvents.CONSUMER_READY)
  async consumerReady(
    client: Socket,
    payload: IConsumerReadyDTO
  ): Promise<IApiResponse<unknown>> {
    try{
      const {producerId, room, socketId, consumerId} = payload;

    const roomSockets = this.roomsUsers[room];
    const roomUsers: IUserConnectionDetail[] = Object.values(roomSockets || {});
    const producingUser = roomUsers.find((user) => user.audioProducerId === producerId || user.videoProducerId === producerId);
      
    if((!producingUser?.isVideoTurnedOff) && producingUser?.videoProducer?.paused) await producingUser?.videoProducer?.resume();
    if((!producingUser?.isAudioTurnedOff) && producingUser?.audiooProducer?.paused) await producingUser?.audiooProducer?.resume()
     
      const consumingUser = roomSockets[socketId || client.id];
      await consumingUser?.consumers?.find((consumer) => consumer.id == consumerId)?.resume();

      return ApiResponse.success("consumer ready handled successfully", payload);
    }catch(error){
      console.log("Error handling consumer ready ", error.message);
      return ApiResponse.fail(error.message, HttpStatus.BAD_REQUEST)
    }
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
        dataProducerId,
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
          dataProducerId,
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
  ): Promise<IApiResponse<{ [socketId: string]: IProducerUser }>> {
    const roomSockets = this.roomsUsers[payload.room];
    if (!roomSockets) {
      const room = await this.roomService.getRoom(payload.room);
      const roomAdmin = {
        [client.id]: { userId: room.owner?.userId },
      };
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
  @SubscribeMessage(BroadcastEvents.LEAVE_ROOM)
  async leaveRoom(
    client: Socket,
    payload: PublishProducerDTO,
  ): Promise<IApiResponse<unknown>> {
    try {
      const { socketId } = payload;
      client.to(socketId).emit(BroadcastEvents.LEAVE_ROOM, payload);
      return ApiResponse.success('remove room triggered successfully', payload);
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
      const { room, action, actionState } = payload;
      const socketId = payload.socketId || client.id;
      const userConnectionDetails = this.roomsUsers[room][socketId] || {};
      this.updateRoomSocketUser(room, socketId, {
        [action]: actionState,
      });
      const producerDto = this.getProducerDTOFromSocket(socketId, room);
      client
        .to(room)
        .emit(BroadcastEvents.USER_REACTION, { ...producerDto, ...payload });
      return producerDto;
    } catch (error) {
      console.log('Error toggling producermode', error.message);
      return ApiResponse.fail('error handling user reaction', error.message);
    }
  }

  @SubscribeMessage(BroadcastEvents.ROOM_CONTEXT_MODIFICATION)
  async roomContextModification(client: Socket, payload: IRoomContext) {
    try {
      const { room } = payload;
      this.updateRoomContext(room, payload);
      const roomContet = this.getRoomContext(room);
      this.server
        .to(room)
        .emit(BroadcastEvents.ROOM_CONTEXT_MODIFICATION, {
          ...roomContet,
          payload,
        });
      return ApiResponse.success(
        'Room context modified successfullly',
        roomContet,
      );
    } catch (error) {
      console.log(this.roomContextModification.name, error.message);
      return ApiResponse.fail(error.message, error);
    }
  }
  @SubscribeMessage(BroadcastEvents.REQUEST_ACCESSIBLITY_PREFERENCE)
  async requestAccessibiltyPreference(
    client: Socket,
    payload: {
      room: string;
      socketId?: string;
      accessibilityPreferences: IAccessibilityPreferences;
    },
  ) {
    try {
      const { room } = payload;
      const socketId = payload.socketId || client.id;
      payload.socketId = socketId;

      const roomUsers = this.roomsUsers[room];
      const admin = Object.values(roomUsers || {}).find((user) => user.isAdmin);
      const producerDto = await this.getProducerDTOFromSocket(socketId, room);
      client
        .to(admin.socketId)
        .emit(BroadcastEvents.REQUEST_ACCESSIBLITY_PREFERENCE, {
          payload,
          ...producerDto,
        });
      return ApiResponse.success(
        'Request for accessibility preference made successfullly',
        producerDto,
      );
    } catch (error) {
      console.log(this.requestAccessibiltyPreference.name, error.message);
      return ApiResponse.fail(error.message, error);
    }
  }

  @SubscribeMessage(BroadcastEvents.REQUEST_FOR_AID_PERSONNEL)
  async requestAidPersonnel(
    client: Socket,
    payload: RequestAidDTO,
  ): Promise<IApiResponse<unknown>> {
    try {
      return ApiResponse.success(
        'Request for aid personnel triggered successfully',
        payload,
      );
    } catch (errror) {
      return ApiResponse.fail(
        (error as any).message,
        error as unknown as PublishProducerDTO,
      );
    }
  }

  @SubscribeMessage(BroadcastEvents.ACCESSIBLITY_PREFERENCE_ACCEPTANCE)
  async accessibiltyPreferenceAcceptance(
    client: Socket,
    payload: AccessibilityPreferenceDTO,
  ) {
    try {
      const { room } = payload;
      const socketId = payload.socketId || client.id;
      await this.updateRoomSocketUser(
        room,
        socketId,
        payload.accessibilityPreferences,
      );
      const producerDto = await this.getProducerDTOFromSocket(client.id, room);
      client
        .to(socketId)
        .emit(BroadcastEvents.ACCESSIBLITY_PREFERENCE_ACCEPTANCE, {
          ...producerDto,
          payload,
        });
      return ApiResponse.success(
        'Accessibility preferce set successfullly',
        producerDto,
      );
    } catch (error) {
      console.log(
        'request for accessibilty preferene acceptance',
        error.message,
      );
      return ApiResponse.fail(error.message, error);
    }
  }

  @SubscribeMessage(BroadcastEvents.ACCESSIBLITY_PREFERENCE_REJECTION)
  async accessibiltyPreferenceRejection(
    client: Socket,
    payload: AccessibilityPreferenceDTO,
  ) {
    try {
      const { room } = payload;
      const socketId = payload.socketId || client.id;
      const producerDto = await this.getProducerDTOFromSocket(client.id, room);
      client
        .to(socketId)
        .emit(BroadcastEvents.ACCESSIBLITY_PREFERENCE_REJECTION, {
          ...producerDto,
          payload,
        });
      return ApiResponse.success(
        'Accessibility preferce rejected successfullly',
        producerDto,
      );
    } catch (error) {
      console.log('accessibility request rejection', error.message);
      return ApiResponse.fail(error.message, error);
    }
  }

  @SubscribeMessage(BroadcastEvents.CHAT_MESSAGE)
  async chatMessage(client: Socket, payload: ChatMessageDTO) {
    try {
      const socketId = payload.socketId || client.id;
      payload.socketId = socketId;
      const producerDto = await this.getProducerDTOFromSocket(
        socketId,
        payload.room,
      );
      payload.usesTextualCommunication = producerDto?.usesTextualCommunication;
      console.log('payload for chat', payload);

      this.server
        .to(payload.room)
        .emit(BroadcastEvents.CHAT_MESSAGE, { ...producerDto, payload });
      return ApiResponse.success('chat sent', payload);
    } catch (error) {
      console.log('Error handling chat message', error.message);
      return ApiResponse.fail('Error handling message', error);
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

  @SubscribeMessage(BroadcastEvents.GET_ROOM_CONTEXT)
  async getRoomContextData(client: Socket, payload: { room: string }) {
    return this.getRoomContext(payload.room);
  }
  @SubscribeMessage(BroadcastEvents.SCREEN_SHARING_STOPPED)
  async screenSharingStopped(client: Socket, payload: CloseMediaDTO) {
    try {
      const socketId = payload.socketId || client.id;
      const roomContet = this.getRoomContext(payload.room);
      if (roomContet?.sharerSocketId !== socketId) return;
      client
        .to(payload.room)
        .emit(BroadcastEvents.SCREEN_SHARING_STOPPED, {
          sharerSocketId: socketId,
          sharerUserName: roomContet.sharerUserName,
          isSharing: false,
        } as IRoomContext);
      console.log('stopped fired');
      const roomProducer = roomContet?.screenShareProducer;
      roomProducer?.close();
      this.updateRoomContext(payload.room, {
        sharerSocketId: '',
        isSharing: false,
        screenShareProducer: null,
        screenShareProducerId: '',
      });
    } catch (error) {
      console.log('Error stoppng screen share', error.message);
    }
  }
  @SubscribeMessage(BroadcastEvents.PRODUCER_CLOSED)
  async producerClosed(client: Socket, payload: CloseMediaDTO) {
    try {
      const socketId = payload.socketId || client.id;
      const socketUser = (this.roomsUsers[payload.room] || {})[socketId];
      if (payload.mediaKind === 'audio') {
        socketUser?.audiooProducer?.close();
        this.updateRoomSocketUser(payload.room, socketId, {
          isAudioTurnedOff: false,
        });
      } else if (payload.mediaKind === 'video') {
        socketUser?.videoProducer?.close();
        this.updateRoomSocketUser(payload.room, socketId, {
          isVideoTurnedOff: false,
        });
      }
      const producerDto = this.getProducerDTOFromSocket(socketId, payload.room);
      client
        .to(payload.room)
        .emit(BroadcastEvents.PRODUCER_PRODUCING, producerDto);
    } catch (error) {
      console.log('Error closing producer', error.message);
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

  private getSocketUserConnectionDetail(
    socketId: string,
    room: string,
  ): IUserConnectionDetail {
    return this.roomsUsers[room] ? this.roomsUsers[room][socketId] : {};
  }

  async notifyAndDeleteClosedProducers(client: Socket) {
    try {
      if (this.roomsUsers) {
        const connectedSockets = Object.values(this.roomsUsers);
        let socketUser: IUserConnectionDetail = connectedSockets.find(
          (socketData) => socketData[client.id],
        );
        socketUser = socketUser[client.id];
        socketUser?.audiooProducer?.close();
        socketUser?.videoProducer?.close();
        const roomContext = this.getRoomContext(socketUser?.room);
        if (roomContext && roomContext?.sharerSocketId === client.id) {
          const dto: CloseMediaDTO = {
            socketId: client.id,
            isScreenSharing: true,
            room: socketUser?.room,
            mediaKind: 'video',
          };

          await this.screenSharingStopped(client, dto);
        }

        if (
          roomContext &&
          roomContext?.specialPresenterSocketId === client.id
        ) {
          const roomContextData: IRoomContext = {
            hasSpecialPresenter: false,
            specialPresenterSocketId: undefined,
            room: socketUser?.room,
          } as IRoomContext;
          await this.roomContextModification(client, roomContextData);
        }
        const producerDto = this.getProducerDTOFromSocket(
          client.id,
          socketUser?.room,
        );
        client
          .to(socketUser?.room)
          .emit(BroadcastEvents.PRODUCER_CLOSED, producerDto);

        delete this.roomsUsers[socketUser?.room][client.id];
      }
    } catch (error) {
      console.log('Error while disconnecting', error.message);
    }
  }

  getProducerDTOFromSocket(socketId: string, room: string): IProducerUser {
    const socketUser = (this.roomsUsers[room] || {})[socketId];
    const {
      audiooProducer,
      videoProducer,
      producerTransport,
      consumer,
      consumerTransport,
      ...producerDto
    } = socketUser || {};
    return producerDto;
  }

  getRoomContext(room: string): IRoomContext {
    return this.roomContexts[room];
  }

  
  getUserDetailFromSocketId(socketId: string, room: string): IUserConnectionDetail {
    const socketUser = (this.roomsUsers[room] || {})[socketId];
    return socketUser;
  }

  updateRoomContext(room: string, dto: IRoomContext) {
    const roomContext = this.roomContexts[room] || {};
    this.roomContexts[room] = { ...roomContext, ...dto };
  }
}
