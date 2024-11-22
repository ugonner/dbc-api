import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
  In,
  FindOptionsWhere,
} from 'typeorm';
import { QueryRoomDTO, RoomDTO } from '../shared/dtos/room.dto';
import { Room } from '../entities/room.entity';
import { DBUtils } from '../shared/helpers/db';
import { Profile } from '../entities/user.entity';
import { CallGateway } from './call.gateway';
import { ISocketUser, IUserConnectionDetail } from '../shared/interfaces/socket-user';
import { BroadcastEvents, ClientEvents } from '../shared/enums/events.enum';
import { Auth } from '../entities/auth.entity';
import { IApiResponse } from '../shared/helpers/apiresponse';

@Injectable()
export class RoomService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
    @Inject("CALL_GATEWWAY")
    private callGateway: CallGateway
  ) {}

  async createRoom(userId: string, dto: RoomDTO): Promise<Room> {
    let newRoom: Room;
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      console.log("userId", userId)
      const user = await queryRunner.manager.findOneBy(Profile, { userId });
      if (!user) throw new NotFoundException('User Account not found');
      const roomId = await DBUtils.generateUniqueID(
        this.roomRepository,
        'roomId',
        8,
        dto.roomName,
      );
      const startTime = new Date(dto.startTime);
      const endTime = DBUtils.addTime(startTime, dto.duration || 20, 'Minutes');
      const room = queryRunner.manager.create(Room, {
        startTime,
        endTime,
        roomId,
        roomName: dto.roomName ? dto.roomName : 'Conference',
        owner: user,
      });
      await queryRunner.manager.save(Room, room);
      await queryRunner.commitTransaction();
      newRoom = room;
    } catch (error) {
      await DBUtils.handleFailedQueryRunner(queryRunner, error);
      throw error;
    } finally {
      await queryRunner.release();
      return newRoom;
    }
  }

  async addParticipants(
    participantIds: string[],
    room: Room,
    queryRunner?: QueryRunner,
  ): Promise<Profile[]> {
    let addedParticipants: Profile[];
    queryRunner = queryRunner
      ? queryRunner
      : this.dataSource.createQueryRunner();
    //const queryBuilder: SelectQueryBuilder<Profile> = queryRunner.manager.createQueryBuilder();
    //const invitees = await queryBuilder.from("Profile").orWhere(`"Profile"."email" IN (${participantIds.join(",")})`).orWhere(`"Profile"."phoneNumber" IN (${participantIds.join(",")})`).getMany();
    const inviteesByEmail = await queryRunner.manager.find(Profile, {
      where: { account: { email: In(participantIds) } },
    });
    const inviteesByPone = await queryRunner.manager.findBy(Profile, {
      phoneNumber: In(participantIds),
    });
    const allParticipants = [
      ...new Set([...inviteesByEmail, ...inviteesByPone]),
    ];
    room.invitees =
      room.invitees.length > 0
        ? [...new Set([...room.invitees, ...allParticipants])]
        : allParticipants;
    await queryRunner.manager.save(Room, room);
    return allParticipants;
  }

  async addParticipantsToRoom(
    participantIds: string[],
    roomId: string,
  ): Promise<Profile[]> {
    let addedParticipants: Profile[];
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const room = await queryRunner.manager.findOne(Room, {
        where: { roomId },
        relations: ['invitees'],
      });
      if (!room) throw new NotFoundException('Room not found');
      addedParticipants = await this.addParticipants(
        participantIds,
        room,
        queryRunner,
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await DBUtils.handleFailedQueryRunner(queryRunner, error);
    } finally {
      await queryRunner.release();
      return addedParticipants;
    }
  }

  async removeParticipants(
    participantIds: string[],
    room: Room,
    queryRunner?: QueryRunner,
  ): Promise<Profile[]> {
    let addedParticipants: Profile[];
    queryRunner = queryRunner
      ? queryRunner
      : this.dataSource.createQueryRunner();
    const filteredParticipants: Profile[] = [];
    participantIds.forEach((participant) => {
      for (let i = 0; i < room.invitees.length; i++) {
        if (
          room.invitees[i].account.email === participant ||
          room.invitees[i].phoneNumber === participant
        ) {
          room.invitees.splice(i, 1);
          break;
        }
      }
    });
    room.invitees = filteredParticipants;
    await queryRunner.manager.save(Room, room);
    return filteredParticipants;
  }

  async getRoom(roomId: string): Promise<Room> {
    return await this.roomRepository.findOne({
      where: { roomId },
      relations: ['owner', 'invitees'],
    });
  }
  async getRooms(dto: QueryRoomDTO): Promise<Room[]> {
    const { userId } = dto;
    const page = dto.page ? Number(dto.page) : 1;
    const limit = dto.limit ? Number(dto.limit) : 50;
    let whereClause: FindOptionsWhere<Room>;
    let rooms: Room[];
    if (userId) {
      whereClause = { invitees: { userId } };
    }
    //rooms = await queryBuilder.skip(page - 1).take(limit).getMany();
    rooms = await this.roomRepository.find({
      where: whereClause,
      relations: ['invitees'],
      order: { id: 'DESC' },
      skip: page - 1,
      take: limit,
    });
    return rooms;
  }

  async getUserByUniqueId(uniqueId: string): Promise<Auth>{
    return await this.authRepository.createQueryBuilder("auth")
    .leftJoinAndSelect("auth.profile", "profile")
    .orWhere(`"auth"."email" = :uniqueId`, {uniqueId})
    .orWhere(`"auth"."userId" = :uniqueId`, {uniqueId})
    .orWhere(`"profile"."phoneNumber" = :uniqueId`, {uniqueId})
    .getOne();
  }


  async requestToJoinRoomParticipants(roomId: string, userId: string): Promise<boolean> {
    
    const roomsUsers: ISocketUser = (this.callGateway.getRoomUsers())[roomId];
    if(!roomsUsers) throw new NotFoundException("No room information found") 
    
    const userSockets: IUserConnectionDetail[] = Object.values(roomsUsers);
    if(userSockets.length === 0) throw new BadRequestException("No room users found");
    const adminSocket = userSockets.find((user) => user.isOwner);
    if(!adminSocket) throw new BadRequestException("Room Owner not available");

    // notify admin socket
    const user = await this.getUserByUniqueId(userId);

    const adminRes: IApiResponse<boolean> = await new Promise((resolve) => {
      this.callGateway.getServer().to(adminSocket.socketId).emit(BroadcastEvents.REQUEST_TO_JOIN, {userId, ...(user || {})}, resolve);
  })

  console.log("admin socket", adminSocket.socketId);
  if(!adminRes) throw new BadRequestException("No response form admin");
  console.log("admin socket", adminSocket.socketId);
  console.log("Response is here", adminRes);
  return adminRes.data ? true : false ;
  }
}
