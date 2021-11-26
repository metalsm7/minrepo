import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MavenController } from './v1/maven/maven.controller';
import { DocController } from './v1/doc/doc.controller';
import { AccessCheckMiddleware } from './v1/access-check.middleware';
import { PublishMiddleware } from './v1/maven/publish.middleware';
import { MavenService } from './v1/maven/maven.service';

@Module({
  imports: [],
  controllers: [AppController, MavenController, DocController],
  providers: [AppService, MavenService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // throw new Error('Method not implemented.');
    consumer
      .apply(AccessCheckMiddleware)
      .forRoutes(MavenController)
      .apply(PublishMiddleware)
      .forRoutes(MavenController);
  }
  
}
