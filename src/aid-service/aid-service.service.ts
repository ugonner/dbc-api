import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AidServiceType } from '../shared/enums/aid-service.enum';
import { Auth } from '../entities/auth.entity';
import { AidService } from '../entities/aid-service.entity';
import { MailService } from '../mail/mail.service';
import { MailDTO } from '../shared/dtos/mail.dto';
import { AidServiceProvider, Room } from '../entities/room.entity';
import { IQueryResult } from '../shared/interfaces/api-response.interface';
import { AidServiceDTO } from '../shared/dtos/aid-service.dto';
import { Console } from 'console';

@Injectable()
export class AidServiceService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  async createAidService(dto: AidServiceDTO): Promise<AidService> {
    const name = dto.name?.trim();

    let newAidServiceData: AidService;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const serviceExists = await queryRunner.manager.findOneBy(AidService, {
        name
      });
      if(serviceExists) throw new BadRequestException("Aid Service alreay exists");
      
      const aidServiceInit = queryRunner.manager.create(AidService, { ...dto });
      const aidService = await queryRunner.manager.save(
        AidService,
        aidServiceInit,
      );
      await queryRunner.commitTransaction();
      newAidServiceData = aidService;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      if (errorData) throw errorData;
      return newAidServiceData;
    }
  }
  async updateAidService(aidServiceId: number, dto: AidServiceDTO): Promise<AidService> {
    
    let newAidServiceData: AidService;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const serviceExists = await queryRunner.manager.findOneBy(AidService, {
        name: dto.name
      });
      if(serviceExists) throw new BadRequestException("Aid Servic already exists");
     

      let aidService = await queryRunner.manager.findOneBy(AidService, {id: aidServiceId});
      if(!aidService) throw new NotFoundException("Service not found");
      const aidServiceData = {...AidService, ...dto};
      aidService = await queryRunner.manager.save(AidService, aidServiceData)
      await queryRunner.commitTransaction();
      newAidServiceData = aidService
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      if (errorData) throw errorData;
      return newAidServiceData;
    }
  }

  async getAidServices(): Promise<IQueryResult<AidService>> {
    const aidServices = await this.dataSource.getRepository(AidService).find({
    relations: ["users"]
    });
    
    return {
      page: 0,
      limit: 0,
      total: aidServices.length,
      data: aidServices
    }
  }

  async updateUserAidService(
    userId: string,
    aidServiceId: number,
    action: 'add' | 'remove',
  ): Promise<Auth> {
    let updateAuthData: Auth;
    let errorData: unknown;
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const auth = await queryRunner.manager.findOne(Auth, {
        where: { userId },
        relations: ['aidServices'],
      });

      const aidService = await queryRunner.manager.findOneBy(AidService, {
        id: aidServiceId,
      });
      if (!auth) throw new NotFoundException('user not found');
      if (!aidService) throw new NotFoundException('Aid service not found');

      if (action === 'add') {
        if (auth.aidServices.find((aid) => aid.id === aidServiceId))
          throw new BadRequestException('Aid service already added');
        auth.aidServices = [...(auth.aidServices || []), aidService];
      }
      if (action === 'remove') {
        if (!auth.aidServices.find((aid) => aid.id === aidServiceId))
          throw new BadRequestException('Aid service NOT already added');
        auth.aidServices = auth.aidServices?.filter(
          (aidService) => aidService.id !== aidService.id,
        );
      }
      const updatedAuth = await queryRunner.manager.save(Auth, auth);
      await queryRunner.commitTransaction();
      updateAuthData = updatedAuth;
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      if (errorData) throw errorData;
      return updateAuthData;
    }
  }
  async requestAidService(aidServiceId: number, roomId: string): Promise<Auth[]> {
    let requestedUsers: Auth[];
    let errorData: unknown;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      requestedUsers = await this.dataSource
        .getRepository(Auth)
        .createQueryBuilder('auth')
        .innerJoin(
          `AidServiceUser`,
          'AidServiceUser',
          `AidServiceUser.authId = auth.id`,
        )
        .where(`AidServiceUser.aidServiceId = :aidServiceId`, { aidServiceId })
        //.andWhere(`AidServiceUser.isBusy = false`)
        .getMany();

        
        const roomData = await queryRunner.manager.findOneBy(Room, { roomId });
        if (!roomData) throw new NotFoundException('Room not foundd');
        
      if (requestedUsers) {
        const updateRoomPromiseRes = await Promise.allSettled(
          requestedUsers.map((requestedAuth) => {
            // update room service provider
        const aidServiceProvider: AidServiceProvider = {
          aidServiceId,
          userId: requestedAuth.userId,
        };
        roomData.aidServiceProviders = [
          ...(roomData.aidServiceProviders || []),
          aidServiceProvider,
        ];
        return queryRunner.manager.save(Room, roomData);
        
          })
        )
        await queryRunner.commitTransaction();

        updateRoomPromiseRes.forEach((res, i) => {
           if(res.status === "fulfilled"){
            const requestedAuth = requestedUsers[i];
              
          const data: MailDTO = {
            to: requestedAuth?.email,
            subject: 'Aid Service Requested',
            template: './aid-service/request-aid-service',
            context: {
              name: requestedAuth.firstName || requestedAuth.userId,
              roomLink: `${process.env.APP_URL}/conference/conference-room/${roomId}/?userId=${requestedAuth.userId}&firstName=${requestedAuth.firstName}&lastName=${requestedAuth.lastName}`,
            },
          };
          this.mailService.sendEmail(data).catch((err) => console.log(err.message))
        
           }
        })
          
      }
    } catch (error) {
      errorData = error;
      await queryRunner.rollbackTransaction();
    } finally {
      if (errorData) throw errorData;
      return requestedUsers;
    }
  }
}
