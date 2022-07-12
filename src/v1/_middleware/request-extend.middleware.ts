import { Injectable, NestMiddleware } from '@nestjs/common';

export interface RequestExtend {
  remote_addr: string;
  secure: boolean;
}

@Injectable()
export class RequestExtendMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const ext: RequestExtend = {} as RequestExtend;
    //
    ext.remote_addr = typeof req.headers['x-forwarded-for'] !== 'undefined' ? req.headers['x-forwarded-for'] as string : req.ip;
    typeof req.headers['x-real-ip'] !== 'undefined' && (ext.remote_addr = req.headers['x-real-ip']);
    ext.remote_addr = ext.remote_addr.replace(/^(::[^:]*:)?(.*)/, '$2').replace(/::1/, '127.0.0.1')
    //
    ext.secure = (typeof req.headers['x-forwarded-proto'] !== 'undefined' ? req.headers['x-forwarded-proto'] as string : req.protocol) === 'https';
    typeof (req as any).ext === 'undefined' && ((req as any).ext = ext);
    next();
  }
}
