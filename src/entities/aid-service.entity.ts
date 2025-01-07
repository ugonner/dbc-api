import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Auth } from "./auth.entity";

@Entity()
export class AidService {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({nullable: true})
    description?: string;

    @ManyToMany(() => Auth, (auth) => auth.aidServices)
    users: Auth[];

    @CreateDateColumn()
    createdAt: Date;
}