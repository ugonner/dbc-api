import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { OpenAPIConfiguration } from './documentation';
import * as fs from 'fs';
import * as path from 'path';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';


async function bootstrap() {
 const   httpsOptions: HttpsOptions = {
  cert: fs.readFileSync(path.join(__dirname, "..", "openssl", "cert.pem")),
  key: fs.readFileSync(path.join(__dirname, "..", "openssl", "key.pem"))
 };
  const app = await NestFactory.create(AppModule, {
    httpsOptions
  });
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.enableCors({ origin: '*' });
  //app.useGlobalFilters(new AllExceptionFilter())
  OpenAPIConfiguration.configureSwagger(app);
  
const port = process.env.PORT || 8000;
  await app.listen(port, () => console.log("Server RUnning on port", port ));
}
bootstrap();
