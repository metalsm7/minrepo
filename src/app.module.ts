import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MavenController } from './v1/maven/maven.controller';
import { DocController } from './v1/doc/doc.controller';
import { AccessCheckMiddleware } from './v1/_middleware/access-check.middleware';
import { ManageCheckMiddleware } from './v1/_middleware/manage-check.middleware';
import { MavenMiddleware } from './v1/_middleware/maven.middleware';
import { ArchiveMiddleware } from './v1/_middleware/archive.middleware';
import { RequestExtendMiddleware } from './v1/_middleware/request-extend.middleware';
import { MavenService } from './v1/maven/maven.service';
import { CallbackController } from './test/callback/callback.controller';
import { ArchiveController } from './v1/archive/archive.controller';
import { ArchiveService } from './v1/archive/archive.service';
import { ManageController } from './v1/manage/manage.controller';
import { urlencoded, json, raw } from 'body-parser';

@Module({
  imports: [],
  controllers: [AppController, MavenController, DocController, CallbackController, ArchiveController, ManageController],
  providers: [AppService, MavenService, ArchiveService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // throw new Error('Method not implemented.');
    consumer
      .apply(urlencoded({ limit: '2mb', }), json({ limit: '2mb', }))
      .forRoutes('*')
      .apply(RequestExtendMiddleware)
      .forRoutes('*')
      .apply(ManageCheckMiddleware)
      .forRoutes(ManageController)
      .apply(AccessCheckMiddleware)
      .forRoutes(MavenController, ArchiveController)
      .apply(MavenMiddleware)
      .forRoutes(MavenController)
      .apply(ArchiveMiddleware)
      .forRoutes(ArchiveController);
  }
}
