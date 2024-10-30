import { Module } from '@nestjs/common';
import { CallGateway } from './call.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { Auth } from '../entities/auth.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, Auth])
  ],
  controllers: [RoomController],
  providers: [
    {
      provide: "CALL_GATEWWAY",
      useClass: CallGateway
    },
    RoomService]
})
export class CallModule {}
