import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MavenController } from './v1/maven/maven.controller';
import { DocController } from './v1/doc/doc.controller';
import { AccessCheckMiddleware } from './v1/_middleware/access-check.middleware';
import { ManageCheckMiddleware } from './v1/_middleware/manage-check.middleware';
import { PublishMiddleware } from './v1/_middleware/publish.middleware';
import { RequestExtendMiddleware } from './v1/_middleware/request-extend.middleware';
import { MavenService } from './v1/maven/maven.service';
import { CallbackController } from './test/callback/callback.controller';
import { ArchiveController } from './v1/archive/archive.controller';
import { ArchiveService } from './v1/archive/archive.service';
import { ManageController } from './v1/manage/manage.controller';

@Module({
  imports: [],
  controllers: [AppController, MavenController, DocController, CallbackController, ArchiveController, ManageController],
  providers: [AppService, MavenService, ArchiveService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // throw new Error('Method not implemented.');
    consumer
      .apply(RequestExtendMiddleware)
      .forRoutes('*')
      .apply(ManageCheckMiddleware)
      .forRoutes(ManageController)
      .apply(AccessCheckMiddleware)
      .forRoutes(MavenController, ArchiveController)
      .apply(PublishMiddleware)
      .forRoutes(MavenController);
  }
  
}
