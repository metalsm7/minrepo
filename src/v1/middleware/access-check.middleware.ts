import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthProvider } from '../provider/auth.provider';
import { RequestExtend } from '../middleware/request-extend.middleware';
import { ApiRes } from '../../common/apires';

@Injectable()
export class AccessCheckMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (typeof req.params.access_key === 'undefined') {
      ApiRes.send(res, 0xA00001);
      return;
    }
    const access_key: string = req.params.access_key;

    const has_auth: boolean = await AuthProvider.has(access_key, ((req as any).ext as RequestExtend).remote_addr);
    // console.log(`AccessCheckMiddleware - has_auth:${has_auth}`);

    if (!has_auth) {
      ApiRes.send(res, 0xA00011);
      return;
    }
    
    next();
  }
}