import { Injectable, NestMiddleware, Req, Res } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthProvider } from '../_provider/auth.provider';
import { RequestExtend } from './request-extend.middleware';
import { ApiRes } from '../../common/apires';

@Injectable()
export class ManageCheckMiddleware implements NestMiddleware {
  async use(@Req() req: Request, @Res() res: Response, next: NextFunction) {
    if (typeof req.headers['credential'] === 'undefined') {
      ApiRes.send(res, 0xA00001);
      return;
    }
    const access_key: string = req.headers['credential'] as string;
    const has_auth: boolean = await AuthProvider.has(access_key, ((req as any).ext as RequestExtend).remote_addr, true);

    if (!has_auth) {
      ApiRes.send(res, 0xA00011);
      return;
    }
    
    next();
  }
}
