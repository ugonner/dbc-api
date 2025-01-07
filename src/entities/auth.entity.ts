import {
  PrimaryGeneratedColumn,
  Column,
  Index,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Role } from './role.entity';
import { AuthStatus, UserType } from '../shared/enums/auth.enum';
import { Profile } from './user.entity';
import { AidServiceType } from '../shared/enums/aid-service.enum';
import { AidService } from './aid-service.entity';

@Entity()
export class Auth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email: string;

  @Column({nullable: true})
  phoneNumber: string;

  @Column()
  password: string;

  @Column({default: UserType.GUEST})
  userType: UserType;

  @Column({default: AuthStatus.INACTIVE})
  status: AuthStatus;

  @Column()
  @Index({ unique: true })
  userId: string;

  @Column({nullable: true})
  firstName: string;
  
  @Column({nullable: true})
  lastName: string;
  

  @Column({ nullable: true })
  otp: number;

  @Column({ nullable: true })
  otpTime: Date;

  @Column('boolean', { default: false })
  isVerified: boolean;

  @ManyToMany(() => AidService, (aidService) => aidService.users)
  @JoinTable({
    name: "AidServiceUser",
  })
  aidServices: AidService[];


  @ManyToOne(() => Role)
  @JoinColumn()
  role: Role;

  @OneToOne(() => Profile, (profile) => profile.account, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  profile: Profile;


  @CreateDateColumn() createdAt!: Date;

  @UpdateDateColumn() updatedAt!: Date;

  @BeforeInsert()
  formatEmail() {
    this.email = this.email.toLowerCase();
  }

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
  toAuthData() {
    const { id, userId, email, status, role, isVerified } = this;
    return { id, userId, email, status, role, isVerified };
  }
}
