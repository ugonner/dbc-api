import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export class OpenAPIConfiguration {
    static configureSwagger(app: INestApplication){
        
  const config = new DocumentBuilder()
  .setTitle('DBC API Doc')
  .setDescription('Documentation of the DBC API')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    showRequestDuration: true,
    docExpansion: 'none',
  },
});
    }
}