import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { OpenAPIConfiguration } from './documentation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.enableCors({ origin: '*' });
  OpenAPIConfiguration.configureSwagger(app);
  
const port = process.env.PORT || 8000;
  await app.listen(port, () => console.log("Server RUnning on port", port ));
}
bootstrap();
