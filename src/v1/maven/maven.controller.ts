import { Controller, Get, Put, Req, Param, Res, HttpStatus, StreamableFile, Response as NestResponse } from '@nestjs/common';
import { Request, Response } from 'express';
import { MavenService, MavenRepo, MavenRepoDetail, MavenRepoDetailDependency } from './maven.service';
import { existsSync, copyFileSync, mkdirSync, unlinkSync, createReadStream, ReadStream } from 'fs';
import { join } from 'path';
import { RequestExtend } from '../_middleware/request-extend.middleware';
import { ApiRes } from '../../common/apires';

interface MavenInfo {
    group_id: string;
    artifact_id: string;
    release?: string;
    version?: string;
    module?: string;
    dependencies?: Array<any>;
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
        // const req_poms: Array<string> = req.params[1].split('-');
        const req_repo_version: string = req.params[1].replace(/(.+)-(\d+\.\d+\.\d+(-.+)?)$/, '$2');
        if (req_repo_version !== version) {
            ApiRes.send(res, 0x100001);
            return;
        }
        const maven_info: MavenInfo = {
            group_id: null,
            artifact_id: null,
        };
        if (req_repo.length > 1) {
            maven_info.artifact_id = req_repo.splice(req_repo.length - 1)[0];
            maven_info.group_id = req_repo.join('.');
            maven_info.version = req_repo_version;
        }
        const repo_detail: any = await this.mavenService.getRepoDetail(maven_info.group_id, maven_info.artifact_id, maven_info.version);
        if (repo_detail === null) {
            ApiRes.send(res, 0x100001);
            return;
        }
        const dependencies: Array<any> = await this.mavenService.getRepoDetailDependency(repo_detail.repo_detail_id);
        maven_info.dependencies = dependencies;
        //
        maven_info.release = repo_detail.release_version as string;
        return res.render(
            'maven/pom',
            { maven_info: maven_info, },
        );
    }

    @Get('*/:version/*.jar')
    async getJar(@Req() req: Request, @NestResponse({ passthrough: true }) res: Response, @Param('access_key') access_key: string, @Param('version') version: string): Promise<StreamableFile> {
        const req_repo: Array<string> = String(req.params[0]).split('/');
        const req_repo_version: string = req.params[1].replace(/(.+)-(\d+\.\d+\.\d+(-.+)?)$/, '$2');
        if (req_repo_version !== version) {
            ApiRes.send(res, 0x100001);
            return;
        }
        const maven_info: MavenInfo = {
            group_id: null,
            artifact_id: null,
        };
        if (req_repo.length > 1) {
            maven_info.artifact_id = req_repo.splice(req_repo.length - 1)[0];
            maven_info.group_id = req_repo.join('.');
            maven_info.version = req_repo_version;
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
        return new StreamableFile(file);
    }

    @Put('*/:version/:format')
    async publish(@Req() req: Request, @Res() res: Response, @Param('version') version: string, @Param('format') format: string): Promise<string> {
        const format_type: string = format.split('.').pop();
        // if (!['jar', 'module', 'pom', 'xml'].includes(format_type)) {
        //     ApiRes.send(res, 0x000000);
        //     return;
        // }
        if (!new RegExp(/.+\.(jar|module|pom)$/).test(format)) {
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
        const is_exists: boolean = await this.mavenService.has(maven_repo.group_id, maven_repo.artifact_id, maven_repo.version);
        if (is_exists && format_type === 'jar') {
            ApiRes.send(res, 0x100011);
            return;
        }
        else if (!is_exists && format_type !== 'jar') {
            ApiRes.send(res, 0x100001);
            return;
        }
        const repo: any = await this.mavenService.getRepo(maven_repo.group_id, maven_repo.artifact_id);

        const now: Date = new Date();
        const save_path: string = join(process.cwd(), 'data', 'repo', String(now.getUTCFullYear()), String(now.getUTCMonth()), String(now.getUTCDate()));
        const temp_path: string = (req as any).tmp_path;
        const save_name: string = (Math.random().toString(36)+'00000000000000000').slice(2, 10 + 2);

        maven_repo.file_path = join(save_path, save_name).replace(process.cwd(), '');

        let rtn_val: boolean = false;
        //
        if (format_type === 'jar') {
            if (repo === null) {
                // 없으면 생성
                rtn_val = await this.mavenService.addRepo(maven_repo);
            }
            else {
                // 버전은 식별자 제외하여 최신 확인
                let idx: number = (repo['latest_version'] as string).indexOf('-');
                const ver_current: string = idx < 0 ? (repo['latest_version'] as string) : (repo['latest_version'] as string).substring(0, idx);
                idx = (maven_repo.version as string).indexOf('-');
                const ver_req: string = idx < 0 ? (maven_repo.version as string) : (maven_repo.version as string).substring(0, idx);
                //
                maven_repo.repo_id = repo.repo_id;
                rtn_val = await this.mavenService.updateRepo(maven_repo, ver_req > ver_current);
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
        }
        else if (
            format_type === 'module' && typeof (req as any).publish !== 'undefined' && typeof (req as any).publish.module !== 'undefined' ||
            format_type === 'pom' && typeof (req as any).publish !== 'undefined' // && typeof (req as any).publish.dependencies !== 'undefined'
        ) {
            const repo_detail: any = await this.mavenService.getRepoDetail(
                maven_repo.group_id as string,
                maven_repo.artifact_id as string,
                maven_repo.version as string
            );
            if (!repo_detail) {
                ApiRes.send(res, 0x100001);
                return;
            }
            if (format_type === 'module') {
                const req_detail: MavenRepoDetail = {
                    repo_detail_id: repo_detail.repo_detail_id,
                    module: (req as any).publish.module,
                };
                rtn_val = await this.mavenService.updateRepoDetail(req_detail);
            }
            else if (format_type === 'pom' && typeof (req as any).publish.dependencies !== 'undefined') {
                const req_dependency: Array<MavenRepoDetailDependency> = new Array<MavenRepoDetailDependency>();
                const list: Array<any> = (req as any).publish.dependencies;
                for (let cnti: number = 0; cnti < list.length; cnti++) {
                    const data: any = list[cnti];
                    req_dependency.push({
                        group_id: data.groupId,
                        artifact_id: data.artifactId,
                        version: data.version,
                        scope: data.scope,
                    } as MavenRepoDetailDependency)
                }
                rtn_val = await this.mavenService.replaceRepoDetailDependency(repo_detail.repo_detail_id, req_dependency);
            }
            /**
                {
                repo_id: 7,
                group_id: '',
                artifact_id: '',
                release_version: '5.0.0',
                version: '5.0.0',
                repo_detail_id: 7,
                file_path: '/data/repo/2021/11/1/kxozpjap8w'
                }
             */

            rtn_val = true;
        }
        
        if (!rtn_val) {
            res.status(HttpStatus.BAD_REQUEST).send();
        }
        else {
            ApiRes.send(res, 0x000000);
        }
    }
}
