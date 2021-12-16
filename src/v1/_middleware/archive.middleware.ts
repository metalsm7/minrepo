import { Injectable, NestMiddleware } from '@nestjs/common';
import { appendFileSync, unlink, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { RequestExtend } from './request-extend.middleware';

@Injectable()
export class ArchiveMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: () => void) {
    const path_regex: RegExp = new RegExp(/^\/v\d+\/[a-zA-Z0-9]+\/archive\/.+?$/);
    if (
      req.method.toUpperCase() !== 'PUT' ||
      !path_regex.test(req.path) ||
      typeof req.headers['content-type'] === 'undefined' || req.headers['content-type'].toLowerCase() !== 'application/octet-stream'
    ) {
      next();
      return;
    }
    const file_name: string = req.path.split('/').pop();
    const save_path: string = join(process.cwd(), 'tmp', `${((req as any).ext as RequestExtend).remote_addr.replace(/[\:\.]/g, '_')}-${file_name}`);

    !existsSync(join(process.cwd(), 'tmp')) && mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
    
    if (existsSync(save_path)) {
      await new Promise((resolve: any, _reject: any) => {
        unlink(save_path, () => {
          resolve();
        })
      });
    }
    
    (req as any).tmp_path = save_path;

    req.on('data', (chunk: any) => {
      appendFileSync(save_path, chunk);
    });
    req.on('end', () => {
      next();
    });
  }
}
