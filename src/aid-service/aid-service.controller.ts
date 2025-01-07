import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseFilters } from '@nestjs/common';
import { AidServiceService } from './aid-service.service';
import { AidServiceDTO, RequestAidServiceDTO, UpdateUserAidServiceDTO } from '../shared/dtos/aid-service.dto';
import { User } from '../shared/guards/decorators/user.decorator';
import { Auth } from '../entities/auth.entity';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { AidServiceType } from '../shared/enums/aid-service.enum';
import { ApiTags } from '@nestjs/swagger';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';

@ApiTags("aid-service")
@UseFilters(AllExceptionFilter)
@Controller('aid-service')
export class AidServiceController {
    constructor(
        private aidServiceService: AidServiceService
    ){}

    @Post()
    async createAidService(
        @Body() payload: AidServiceDTO
    ){
        const res = await this.aidServiceService.createAidService(payload);
        return ApiResponse.success("Aid service created", res);
    }

    @Post("update-aid-service/:userId/:action")
    async updateAidService(
        @Body() payload: UpdateUserAidServiceDTO,
        @Param("action") action: "add" | "remove",
        @Param("userId") userId: string 
    ){
        action = action === "remove" ? "remove" : "add";
        const res = await this.aidServiceService.updateUserAidService(userId as string, Number(payload.id), action);
        return ApiResponse.success("Aid service updated", res);
    }

    @Post("request-aid-service")
    async requestAidService(
        @Body() payload: RequestAidServiceDTO,
        @User() user: Auth
    ){
        const res = await this.aidServiceService.requestAidService(Number(payload.id), payload.roomId);
        return ApiResponse.success("Aid service request successful", res)
    }

    @Put("/:id")
    async editAidService(
        @Param("id", new ParseIntPipe()) aidServiceId: number,
        @Body() payload: AidServiceDTO
    ){
        const res = await this.aidServiceService.updateAidService(aidServiceId, payload);
        return ApiResponse.success("Aid serice edited successfully", res);
    }
    @Get()
    async getAidService(){
        const res = await this.aidServiceService.getAidServices();
        return ApiResponse.success("Aid services retrieved successfuly", res);
    }
}
