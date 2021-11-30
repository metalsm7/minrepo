import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function init() {
  const path_db: string = join(process.cwd(), 'data', 'db');
  !existsSync(path_db) && mkdirSync(path_db, { recursive: true });
  !existsSync(join(path_db, 'db.sqlite')) && execSync('sqlite3 data/db/db.sqlite < resource/init.sql');
  
  const path_repo: string = join(process.cwd(), 'data', 'repo');
  !existsSync(path_repo) && mkdirSync(path_repo, { recursive: true });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setBaseViewsDir(path.join(process.cwd(), 'views'));
  app.setViewEngine('hbs');
  app.use(helmet());
  app.enableCors();
  await app.listen(3000);
}

init();

bootstrap();
