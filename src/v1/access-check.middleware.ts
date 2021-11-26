import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AccessCheckMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // console.log(`AccessCheck - path:${req.path}`);
    if (typeof req.params.access_key === 'undefined') {
      res.send({code: 'Ex100001'});
      return;
    }
    const access_key: string = req.params.access_key;
    // console.log(`AccessCheck - access_key:${access_key}`);
    // console.log(req.params);
    
    next();
  }
}
