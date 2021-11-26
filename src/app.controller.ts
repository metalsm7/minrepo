import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('version')
  getHello(): string {
    // return this.appService.getHello();
    return require('../package.json').version;
  }
}
