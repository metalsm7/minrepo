import { Controller, Get, Put, Req, Param, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { MavenService, MavenRepo } from '../provider/maven.service';
import { existsSync, copyFileSync, mkdirSync, unlinkSync, createReadStream, ReadStream } from 'fs';
import { join } from 'path';
import { RequestExtend } from '../middleware/request-extend.middleware';
import { ApiRes } from '../../common/apires';

interface MavenInfo {
    group_id: string;
    artifact_id: string;
    release?: string;
    version?: string;
    versions?: Array<string>;
    last_updated?: string;
}

@Controller('v1/:access_key/maven')
export class MavenController {
    constructor(private readonly mavenService: MavenService) {}

    @Get('*/maven-metadata.xml')
    async getMetadata(@Req() req: Request, @Res() res: Response, @Param('access_key') access_key: string) {
        const req_repo: Array<string> = String(req.params[0]).split('/');
        const maven_info: MavenInfo = {
            group_id: null,
            artifact_id: null,
        };
        if (req_repo.length > 1) {
            maven_info.artifact_id = req_repo.splice(req_repo.length - 1)[0];
            maven_info.group_id = req_repo.join('.');
        }
        const repo: any = await this.mavenService.getRepo(maven_info.group_id, maven_info.artifact_id);
        if (repo === null) {
            ApiRes.send(res, 0x100001);
            return;
        }
        //
        const repo_id: number = repo.repo_id as number;
        const versions: Array<string> = await this.mavenService.getRepoVersions(repo_id);
        versions.sort((src: string, tgt: string): any => {
            return src < tgt ? -1 : 1;
        });
        //
        maven_info.release = repo.release_version as string;
        maven_info.last_updated = repo.created_at as string;
        maven_info.versions = versions;
        return res.render(
            'maven/metadata',
            { maven_info: maven_info, },
        );
    }

    @Get('*/:version/*.pom') // {artifact_id}-{version}.pom
    async getPom(@Req() req: Request, @Res() res: Response, @Param('access_key') access_key: string, @Param('version') version: string) {
        const req_repo: Array<string> = String(req.params[0]).split('/');
        const req_poms: Array<string> = req.params[1].split('-');
        const maven_info: MavenInfo = {
            group_id: null,
            artifact_id: null,
        };
        if (req_repo.length > 1) {
            maven_info.artifact_id = req_repo.splice(req_repo.length - 1)[0];
            maven_info.group_id = req_repo.join('.');
            maven_info.version = req_poms[1];
        }
        const repo_detail: any = await this.mavenService.getRepoDetail(maven_info.group_id, maven_info.artifact_id, maven_info.version);
        if (repo_detail === null) {
            ApiRes.send(res, 0x100001);
            return;
        }
        //
        maven_info.release = repo_detail.release_version as string;
        return res.render(
            'maven/pom',
            { maven_info: maven_info, },
        );
    }

    @Get('*/:version/*.jar')
    async getJar(@Req() req: Request, @Res() res: Response, @Param('access_key') access_key: string, @Param('version') version: string) {
        const req_repo: Array<string> = String(req.params[0]).split('/');
        const req_poms: Array<string> = req.params[1].split('-');
        const maven_info: MavenInfo = {
            group_id: null,
            artifact_id: null,
        };
        if (req_repo.length > 1) {
            maven_info.artifact_id = req_repo.splice(req_repo.length - 1)[0];
            maven_info.group_id = req_repo.join('.');
            maven_info.version = req_poms[1];
        }
        const repo_detail: any = await this.mavenService.getRepoDetail(maven_info.group_id, maven_info.artifact_id, maven_info.version);
        if (repo_detail === null) {
            ApiRes.send(res, 0x100001);
            return;
        }
        if (typeof repo_detail.file_path === 'undefined' || (repo_detail.file_path as string).length < 1) {
            ApiRes.send(res, 0x100002);
            return;
        }
        // 다운로드 기록 추가
        await this.mavenService.addAccessHistory(repo_detail.repo_id, repo_detail.repo_detail_id, req.params.access_key, ((req as any).ext as RequestExtend).remote_addr);
        //
        const file: ReadStream = createReadStream(join(process.cwd(), repo_detail.file_path as string));
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${repo_detail.artifact_id as string}-${repo_detail.version as string}.jar"`,
        });
        file.pipe(res);
    }

    @Put('*/:version/:format')
    async publish(@Req() req: Request, @Res() res: Response, @Param('version') version: string, @Param('format') format: string): Promise<string> {
        const req_regex: RegExp = new RegExp(/.+\.(pom|xml).*/);
        if (req_regex.test(format)) {
            ApiRes.send(res, 0x000000);
            return;
        }
        const proc_regex: RegExp = new RegExp(/.+\.jar$/);
        if (!proc_regex.test(format)) {
            ApiRes.send(res, 0x000000);
            return;
        }
        const req_repo: Array<string> = String(req.params[0]).split('/');
        const maven_repo: MavenRepo = {
            group_id: null,
            artifact_id: null,
        };
        if (req_repo.length > 1) {
            maven_repo.artifact_id = req_repo.splice(req_repo.length - 1)[0];
            maven_repo.group_id = req_repo.join('.');
            maven_repo.version = version;
        }
        const is_exists: boolean = await this.mavenService.exists(maven_repo.group_id, maven_repo.artifact_id, maven_repo.version);
        if (is_exists) {
            ApiRes.send(res, 0x100011);
            return;
        }
        const repo: any = await this.mavenService.getRepo(maven_repo.group_id, maven_repo.artifact_id);

        const now: Date = new Date();
        const save_path: string = join(process.cwd(), 'data', 'repo', String(now.getUTCFullYear()), String(now.getUTCMonth()), String(now.getUTCDate()));
        const temp_path: string = (req as any).tmp_path;
        const save_name: string = (Math.random().toString(36)+'00000000000000000').slice(2, 10+2);

        maven_repo.file_path = join(save_path, save_name).replace(process.cwd(), '');

        let rtn_val: boolean = false;
        if (repo === null) {
            // 없으면 생성
            rtn_val = await this.mavenService.addRepo(maven_repo);
        }
        else {
            // 있으면 & 버전이 올라가면 업데이트
            // if ((repo['latest_version'] as string) > (maven_repo.version as string)) {
            //     res.status(HttpStatus.BAD_REQUEST).send();
            //     return;
            // }
            maven_repo.repo_id = repo.repo_id;
            rtn_val = await this.mavenService.updateRepo(
                maven_repo,
                (repo['latest_version'] as string) < (maven_repo.version as string)
            );
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
}
