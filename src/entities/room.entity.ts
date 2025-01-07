import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Profile } from "./user.entity";

export class AidServiceProvider {
    userId: string;
    aidServiceId: number;
}

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

    @Column({type: "jsonb", nullable: true})
    aidServiceProviders: AidServiceProvider[];
    
    @ManyToMany(() => Profile)
    @JoinTable({
        name: "RoomParticipant",
    })
    invitees: Profile[];

    @ManyToOne(() => Profile)
    owner: Profile;
    
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}