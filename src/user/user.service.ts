import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Profile } from '../entities/user.entity';
import { Auth } from '../entities/auth.entity';
import { UpdateProfileDTO, UserProfileDTO } from '../shared/dtos/user.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ){}

    async updateUser(
        userId: string,
        dto: UpdateProfileDTO
    ): Promise<Profile>{
        let newUser: Profile;
        let errorData: unknown;

        const queryRunner = this.dataSource.createQueryRunner();
        try{
            await queryRunner.startTransaction();
            const {firstName, lastName} = dto;
            const authUser = await queryRunner.manager.findOne(Auth, {
                where: {userId},
                relations: ["profile"]
            });
            if(!authUser) throw new NotFoundException("No user found");
            const profile = authUser.profile;

            if(firstName || lastName){
                const authData = {firstName, lastName};
                await queryRunner.manager.save(Auth, {...authUser, ...authData});
            }
            const userData = {...profile, ...dto};
            const user = await queryRunner.manager.save(Profile, userData);
            await queryRunner.commitTransaction();
            newUser = user;
        }catch(error){
            errorData = error;
            await queryRunner.rollbackTransaction();
        }finally{
            if(errorData) throw errorData;
            return newUser;
        }
    }
}
