import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CallModule } from './call/call.module';

@Module({
  imports: [CallModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
