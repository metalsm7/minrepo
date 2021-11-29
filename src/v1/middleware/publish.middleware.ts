import { Injectable, NestMiddleware } from '@nestjs/common';
import { Encoding } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { appendFile, unlink, existsSync } from 'fs';
import { join } from 'path';

// export function rawParser(req: Request, res: Response, next: NextFunction) {
//   console.log(`PublishMiddleware`);
//   raw({
//     // type: 'application/octet-stream',
//     verify: (req: Request, res: Response, buf: Buffer, enc: Encoding) => {
//       console.log(`PublishMiddleware - buf:${buf}`);
//     }
//   });
//   next();
// };
@Injectable()
export class PublishMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // const path_regex: RegExp = new RegExp(/^\/v\d+\/[a-zA-Z0-9]+\/maven\/.+\.(jar|pom|xml)(\.sha1|\.md5|\.sha256|\.sha512)?$/);
    const path_regex: RegExp = new RegExp(/^\/v\d+\/[a-zA-Z0-9]+\/maven\/.+\.(jar)(\.sha1|\.md5|\.sha256|\.sha512)?$/);
    // const content_type: string = req.headers['content-type'];
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
    // console.log(`  >> PublishMiddleware - file_name:${file_name}`);
    // console.log(`  >> PublishMiddleware - save_path:${save_path}`);
    // console.log(`  >> PublishMiddleware - pass_as_param:${pass_as_param}`);

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
        // console.log(`  >> PublishMiddleware - checksum:${JSON.stringify(checksum)}`);
      }
      else {
        if (existsSync(save_path)) {
          await new Promise((resolve: any, _reject: any) => {
            unlink(save_path, () => {
              resolve();
            })
          });
        }
        await new Promise((resolve: any, _reject: any) => {
          appendFile(save_path, chunk, () => {
            req['tmp_path'] = save_path;
            resolve();
          });
        });
      }
    });
    req.on('end', () => {
      // console.log(`on end`);
      next();
    });
  }
}