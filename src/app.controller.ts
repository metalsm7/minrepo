import { Controller, Get, Ip, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequestExtend } from './v1/_middleware/request-extend.middleware';
// import { AppService } from './app.service';

@Controller()
export class AppController {
  // constructor(private readonly appService: AppService) {}

  @Get('i')
  getHello(@Ip() ip: string, @Req() req: Request): object {
    // return this.appService.getHello();
    const pkg_path: string = process.env.NODE_ENV === 'production' ? './package.json' : '../package.json';
    return {
      version: require(pkg_path).version,
      remote_addr: ((req as any).ext as RequestExtend).remote_addr,
      is_secure: ((req as any).ext as RequestExtend).secure
    };
  }
}
