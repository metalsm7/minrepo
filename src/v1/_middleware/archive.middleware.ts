import { Injectable, NestMiddleware } from '@nestjs/common';
import { appendFileSync, unlink, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { RequestExtend } from './request-extend.middleware';
import { RegExps } from '../../common/define';
import { ArchiveInfo } from '../_interface/archive.interface';

@Injectable()
export class ArchiveMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: () => void) {
    //
    const archiveInfo: ArchiveInfo = {
      group_id: req.path.replace(RegExps.ReqArchive, '$1').replace(/\//g, '.'),
      artifact_id: req.path.replace(RegExps.ReqArchive, '$2'),
      version: req.path.replace(RegExps.ReqArchive, '$3'),
      file_ext: req.path.replace(RegExps.ReqArchive, '$4') !== '' ? req.path.replace(RegExps.ReqArchive, '$4').replace(/\//g, '.') : undefined,
    };
    if (
      !['PUT', 'POST'].includes(req.method.toUpperCase()) ||
      !RegExps.ReqArchive.test(req.path) ||
      typeof req.headers['content-type'] === 'undefined' || req.headers['content-type'].toLowerCase() !== 'application/octet-stream'
    ) {
      next();
      return;
    }
    //
    if (archiveInfo.group_id === '' || archiveInfo.artifact_id === '' || !RegExps.Version.test(archiveInfo.version)) {
      next();
      return;
    }
    
    const file_name: string = `${archiveInfo.group_id}-${archiveInfo.artifact_id}-${archiveInfo.version}`;
    const save_path: string = join(process.cwd(), 'tmp', `${(Math.random().toString(36)+'00000000000000000').slice(2, 10 + 2)}-${file_name}`);

    !existsSync(join(process.cwd(), 'tmp')) && mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
    existsSync(save_path) && unlinkSync(save_path);
    
    (req as any).tmp_path = save_path;

    req.on('data', (chunk: any) => {
      appendFileSync(save_path, chunk);
    });
    req.on('end', () => {
      next();
    });
  }
}
