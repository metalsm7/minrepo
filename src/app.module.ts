import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MavenController } from './v1/controller/maven.controller';
import { DocController } from './v1/doc/doc.controller';
import { AccessCheckMiddleware } from './v1/middleware/access-check.middleware';
import { PublishMiddleware } from './v1/middleware/publish.middleware';
import { RequestExtendMiddleware } from './v1/middleware/request-extend.middleware';
import { MavenService } from './v1/provider/maven.service';
import { CallbackController } from './test/callback/callback.controller';

@Module({
  imports: [],
  controllers: [AppController, MavenController, DocController, CallbackController],
  providers: [AppService, MavenService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // throw new Error('Method not implemented.');
    consumer
      .apply(RequestExtendMiddleware)
      .forRoutes('*')
      .apply(AccessCheckMiddleware)
      .forRoutes(MavenController)
      .apply(PublishMiddleware)
      .forRoutes(MavenController);
  }
  
}
