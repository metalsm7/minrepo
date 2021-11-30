import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { appendFile, unlink, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class PublishMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const path_regex: RegExp = new RegExp(/^\/v\d+\/[a-zA-Z0-9]+\/maven\/.+\.(jar)(\.sha1|\.md5|\.sha256|\.sha512)?$/);
    if (
      req.method.toUpperCase() !== 'PUT' ||
      !path_regex.test(req.path) ||
      typeof req.headers['content-type'] === 'undefined' || req.headers['content-type'].toLowerCase() !== 'application/octet-stream'
    ) {
      next();
      return;
    }
    const file_name: string = req.path.split('/').pop();
    const save_path: string = join(process.cwd(), 'tmp', file_name);
    const file_regex: RegExp = new RegExp(/.+\.(md5|sha1|sha256|sha512)?$/);
    const pass_as_param: boolean = file_regex.test(file_name);

    !existsSync(join(process.cwd(), 'tmp')) && mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
    
    if (existsSync(save_path)) {
      await new Promise((resolve: any, _reject: any) => {
        unlink(save_path, () => {
          resolve();
        })
      });
    }
    
    (req as any).tmp_path = save_path;

    const checksum: any = {
      method: pass_as_param ? file_name.replace(file_regex, '$1') : null,
      value: null,
    };

    req.on('data', async (chunk: any) => {
      // console.log(`chunk`);
      // console.log(chunk);
      if (pass_as_param) {
        checksum.value = (chunk as Buffer).toString();
        req['checksum'] = checksum;
      }
      else {
        await new Promise((resolve: any, _reject: any) => {
          appendFile(save_path, chunk, () => {
            resolve();
          });
        });
      }
    });
    req.on('end', () => {
      next();
    });
  }
}
