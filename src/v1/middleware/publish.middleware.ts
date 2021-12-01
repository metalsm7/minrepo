import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { appendFileSync, unlink, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { RequestExtend } from '../middleware/request-extend.middleware';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class PublishMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const path_regex: RegExp = new RegExp(/^\/v\d+\/[a-zA-Z0-9]+\/maven\/.+\.(jar|pom|module)(\.sha1|\.md5|\.sha256|\.sha512)?$/);
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
    const file_regex_checksum: RegExp = new RegExp(/.+\.(jar|pom|module|xml)\.(md5|sha1|sha256|sha512)$/);
    const is_checksum: boolean = file_regex_checksum.test(file_name);
    // const is_jar: boolean = new RegExp(/.+\.(jar)$/).test(file_name);
    // const is_metadata: boolean = new RegExp(/.+\.(xml)$/).test(file_name);
    const is_pom: boolean = new RegExp(/.+\.(pom)$/).test(file_name);
    const is_module: boolean = new RegExp(/.+\.(module)$/).test(file_name);

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
      target: is_checksum ? file_name.replace(file_regex_checksum, '$1') : null,
      method: is_checksum ? file_name.replace(file_regex_checksum, '$2') : null,
      value: null,
    };

    req.on('data', (chunk: any) => {
      if (is_checksum) {
        checksum.value = (chunk as Buffer).toString();
        (req as any).publish = {
          checksum,
        };
      }
      else {
        appendFileSync(save_path, chunk);
      }
    });
    req.on('end', () => {
      if (is_pom) {
        const pom: any = new XMLParser().parse(readFileSync(save_path));
        (req as any).publish = { dependencies: pom.project.dependencies.dependency, };
        // groupId, artifactId, version, scope
        unlinkSync(save_path);
      }
      else if (is_module) {
        const module: string = readFileSync(save_path, 'utf8');
        (req as any).publish = { module, };
        unlinkSync(save_path);
      }
      next();
    });
  }
}
