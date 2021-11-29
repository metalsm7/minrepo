import { Controller, Get, Ip, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('version')
  getHello(@Ip() ip: string, @Req() req: Request): object {
    // return this.appService.getHello();
    return {
      remote: ip,
      remote_req: req.ip,
      remote_addr: (req as any).remote_addr,
      headers: req.headers,
      version: require('../package.json').version
    };
  }
}
