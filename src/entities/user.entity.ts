import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Auth } from "./auth.entity";
import { Gender } from "../shared/enums/user.enum";

@Entity()
export class Profile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column({nullable: true})
    firstName?: string;

    @Column({nullable: true})
    lastName?: string;

    @Column({nullable: true})
    avatar?: string;

    @Column({nullable: true})
    gender?: Gender;

    @Column({nullable: true})
    phoneNumber?: string;

    @OneToOne(() => Auth, (auth) => auth.profile)
    account: Auth;

}