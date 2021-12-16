import { Controller, Get, Put, Param, Req, Res, StreamableFile } from '@nestjs/common';
import { Request, Response } from 'express';
import { existsSync, copyFileSync, mkdirSync, unlinkSync, createReadStream, ReadStream } from 'fs';
import { join } from 'path';
import { ArchiveService } from './archive.service';
import { ArchiveInfo } from '../_interface/archive.interface';
import { ApiRes } from '../../common/apires';
import { RegExps } from '../../common/define';
import { RequestExtend } from '../_middleware/request-extend.middleware';

@Controller('v1/:access_key/archive')
export class ArchiveController {
    constructor(private readonly archiveService: ArchiveService) {}

    @Put('*/:version')
    update(@Param('version') version: string, @Req() req: Request, @Res() res: Response) {
        //
        const req_ids: Array<string> = req.params[0].split('/');
        if (req_ids.length < 2) {
            ApiRes.send(res, 0x100101);
            return;
        }
        //
        const info: ArchiveInfo = {
            artifact_id: req_ids.pop(),
            group_id: req_ids.join('.'),
            version,
        };
        //
        console.log(`info:${JSON.stringify(info)}`);
        //
        return info;
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
        const archiveService: ArchiveInfo = {
            artifact_id: req_ids.pop(),
            group_id: req_ids.join('.'),
            version,
        };
        //
        console.log(`archiveService:${JSON.stringify(archiveService)}`);
        const repo_detail: any = await this.archiveService.getRepoDetail(archiveService.group_id, archiveService.artifact_id, archiveService.version);
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
            'Content-Disposition': `attachment; filename="${repo_detail.artifact_id as string}-${repo_detail.version as string}.jar"`,
        });
        return new StreamableFile(file);
    }
}
