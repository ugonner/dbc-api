import { Body, Controller, Put, Query, UseFilters, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Profile } from '../entities/user.entity';
import { User } from '../shared/guards/decorators/user.decorator';
import { ApiResponse } from '../shared/helpers/apiresponse';
import { JwtGuard } from '../shared/guards/jwt.guards';
import { Auth } from '../entities/auth.entity';
import { UpdateProfileDTO, UserProfileDTO } from '../shared/dtos/user.dto';
import { ApiTags } from '@nestjs/swagger';
import { AllExceptionFilter } from '../shared/interceptors/all-exceptions.filter';

@ApiTags("user")
@UseFilters(AllExceptionFilter)
@Controller('user')
export class UserController {
    constructor(
        private userService: UserService
    ){}

    @Put()
    //@UseGuards(JwtGuard)
    async updateUser(
        @Body() payload: UpdateProfileDTO,
        @User() user: Auth,
        @Query() queryPayload: {userId: string}
    ){
        const userId = queryPayload.userId || user?.userId;
        const res = await this.userService.updateUser(userId, payload);
        return ApiResponse.success("user updated successfully", res);
    }
}
