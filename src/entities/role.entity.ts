import { Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @Column({ unique: true })
  name: string;

  @Expose()
  @Column({ nullable: true })
  description: string;

  @Expose()
  @Column({ type: 'json', nullable: true })
  permissions: { [key: string]: boolean };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn() updatedAt!: Date;
}
