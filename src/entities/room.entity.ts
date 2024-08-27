import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Profile } from "./user.entity";

@Entity()
export class Room {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    startTime: Date;

    @Column()
    endTime: Date;

    @Column()
    roomId: string;

    @Column()
    roomName: string;

    @ManyToMany(() => Profile)
    @JoinTable({
        name: "RoomParticipant",
    })
    invitees: Profile[];

    @ManyToOne(() => Profile)
    owner: Profile;    
}