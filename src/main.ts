import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setBaseViewsDir(path.join(process.cwd(), 'views'));
  app.setViewEngine('hbs');
  app.use(helmet());
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
