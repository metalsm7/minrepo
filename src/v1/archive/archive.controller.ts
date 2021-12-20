import { Controller, Get, Post, Param, Req, Res, HttpStatus, StreamableFile } from '@nestjs/common';
import { Request, Response } from 'express';
import { existsSync, copyFileSync, mkdirSync, unlinkSync, createReadStream, ReadStream, statSync } from 'fs';
import { join } from 'path';
import { ArchiveService } from './archive.service';
import { ArchiveInfo } from '../_interface/archive.interface';
import { ApiRes } from '../../common/apires';
import { RegExps } from '../../common/define';
import { RequestExtend } from '../_middleware/request-extend.middleware';

@Controller('v1/:access_key/archive')
export class ArchiveController {
    constructor(private readonly archiveService: ArchiveService) {}

    @Post('*/:version')
    async add(@Param('version') version: string, @Req() req: Request, @Res() res: Response) {
        //
        const archiveInfo: ArchiveInfo = {
          group_id: req.path.replace(RegExps.ReqArchive, '$1').replace(/\//g, '.'),
          artifact_id: req.path.replace(RegExps.ReqArchive, '$2'),
          version: req.path.replace(RegExps.ReqArchive, '$3'),
          file_ext: req.path.replace(RegExps.ReqArchive, '$4') !== '' ? req.path.replace(RegExps.ReqArchive, '$4').replace(/\//g, '.') : undefined,
        };
        //
        const is_exists: boolean = await this.archiveService.has(archiveInfo.group_id, archiveInfo.artifact_id, archiveInfo.version);
        if (is_exists) {
            existsSync((req as any).tmp_path) && unlinkSync((req as any).tmp_path);   
            ApiRes.send(res, 0x100011);
            return;
        }
        const repo: any = await this.archiveService.getRepo(archiveInfo.group_id, archiveInfo.artifact_id);

        const now: Date = new Date();
        const save_path: string = join(process.cwd(), 'data', 'repo', 'archive', String(now.getUTCFullYear()), String(now.getUTCMonth()), String(now.getUTCDate()));
        const temp_path: string = (req as any).tmp_path;
        const save_name: string = (Math.random().toString(36)+'00000000000000000').slice(2, 10 + 2);

        archiveInfo.file_path = join(save_path, save_name).replace(process.cwd(), '');
        archiveInfo.file_size = statSync(temp_path).size;

        let rtn_val: boolean = false;
        if (repo === null) {
            // 없으면 생성
            rtn_val = await this.archiveService.addRepo(archiveInfo);
        }
        else {
            // 버전은 식별자 제외하여 최신 확인
            let idx: number = (repo['latest_version'] as string).indexOf('-');
            const ver_current: string = idx < 0 ? (repo['latest_version'] as string) : (repo['latest_version'] as string).substring(0, idx);
            idx = (archiveInfo.version as string).indexOf('-');
            const ver_req: string = idx < 0 ? (archiveInfo.version as string) : (archiveInfo.version as string).substring(0, idx);
            //
            archiveInfo.repo_id = repo.repo_id;
            rtn_val = await this.archiveService.updateRepo(archiveInfo, ver_req > ver_current);
        }

        if (rtn_val) {
            if (typeof temp_path !== 'undefined' && temp_path.length > 0 && existsSync(temp_path)) {
                !existsSync(save_path) && mkdirSync(save_path, { recursive: true });
                existsSync(temp_path) && copyFileSync(temp_path, join(save_path, save_name));
                // existsSync(temp_path) && unlinkSync(temp_path);
                // renameSync(temp_path, join(save_path, save_name));
            }
        }
        existsSync(temp_path) && unlinkSync(temp_path);        

        if (!rtn_val) {
            res.status(HttpStatus.BAD_REQUEST).send();
        }
        else {
            ApiRes.send(res, 0x000000);
        }
    }

    @Get('*/:version')
    async get(@Param('version') version: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        //
        const req_ids: Array<string> = req.params[0].split('/');
        // validation
        if (req_ids.length < 2) {
            ApiRes.send(res, 0x100101);
            return;
        }
        if (!RegExps.Version.test(version)) {
            ApiRes.send(res, 0x100012);
            return;
        }
        //
        const archiveInfo: ArchiveInfo = {
            artifact_id: req_ids.pop(),
            group_id: req_ids.join('.'),
            version,
        };
        //
        const repo_detail: any = await this.archiveService.getRepoDetail(archiveInfo.group_id, archiveInfo.artifact_id, archiveInfo.version);
        if (repo_detail === null) {
            ApiRes.send(res, 0x100001);
            return;
        }
        if (typeof repo_detail.file_path === 'undefined' || (repo_detail.file_path as string).length < 1) {
            ApiRes.send(res, 0x100002);
            return;
        }
        // 다운로드 기록 추가
        await this.archiveService.addAccessHistory(repo_detail.repo_id, repo_detail.repo_detail_id, req.params.access_key, ((req as any).ext as RequestExtend).remote_addr);
        //
        const file: ReadStream = createReadStream(join(process.cwd(), repo_detail.file_path as string));
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${repo_detail.group_id as string}-${repo_detail.artifact_id as string}-${repo_detail.version as string}${typeof repo_detail.file_ext !== 'undefined' ? `.${repo_detail.file_ext}` : ''}"`,
        });
        return new StreamableFile(file);
    }
}
