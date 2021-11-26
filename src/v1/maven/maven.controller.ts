import { Controller, Get, Put, StreamableFile, Req, Param, Res, HttpStatus, Next } from '@nestjs/common';
// import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { MavenService, MavenRepo } from './maven.service';
import { unlink, existsSync, renameSync, mkdirSync, unlinkSync, createReadStream, ReadStream } from 'fs';
import { join } from 'path';

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
    // @Render('maven/metadata')
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
        // const exists: boolean = await this.mavenService.exists(maven_info.group_id, maven_info.artifact_id);
        // if (exists) {
        //     const repo: any = await this.mavenService.getRepo(maven_info.group_id, maven_info.artifact_id);
        //     if (repo !== null) {
        //         //
        //         const repo_id: number = repo.repo_id as number;
        //         const versions: Array<string> = await this.mavenService.getRepoVersions(repo_id);
        //         //
        //         maven_info.release = repo.release_version as string;
        //         maven_info.last_updated = repo.created_at as string;
        //         maven_info.versions = versions;
        //     }
        // }
        const repo: any = await this.mavenService.getRepo(maven_info.group_id, maven_info.artifact_id);
        if (repo === null) {
            res.status(HttpStatus.NOT_FOUND).send();
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
    // @Render('maven/pom')
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
            res.status(HttpStatus.NOT_FOUND).send();
            return;
        }
        // console.log(`repo_detail`);
        // console.log(repo_detail);
        //
        maven_info.release = repo_detail.release_version as string;
        return res.render(
            'maven/pom',
            { maven_info: maven_info, },
        );
    }

    @Get('*/:version/*.jar')
    // @Render('maven/pom')
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
            res.status(HttpStatus.NOT_FOUND).send();
            return;
        }
        // console.log(`repo_detail`);
        // console.log(repo_detail);
        if (typeof repo_detail.file_path === 'undefined' || (repo_detail.file_path as string).length < 1) {
            res.status(HttpStatus.NOT_FOUND).send();
            return;
        }
        const file: ReadStream = createReadStream(join(process.cwd(), repo_detail.file_path as string));
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${repo_detail.artifact_id as string}-${repo_detail.version as string}.jar"`,
        });
        // return new StreamableFile(file);
        file.pipe(res);
    }

    @Put('*/:version/:format')
    async publish(@Req() req: Request, @Res() res: Response, @Param('version') version: string, @Param('format') format: string): Promise<string> {
        const req_regex: RegExp = new RegExp(/.+\.(pom|xml).*/);
        if (req_regex.test(format)) {
            res.status(HttpStatus.OK).send();
            return;
        }
        const proc_regex: RegExp = new RegExp(/.+\.jar$/);
        if (!proc_regex.test(format)) {
            res.status(HttpStatus.OK).send();
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
        const repo: any = await this.mavenService.getRepo(maven_repo.group_id, maven_repo.artifact_id);
        // console.log(`-`.repeat(30));
        // console.log(`format:${format}`);
        // console.log(`version:${version}`);
        // console.log(`maven_repo:${JSON.stringify(maven_repo)}`);
        // console.log(`repo:${JSON.stringify(repo)}`);
        // console.log(`headers`);
        // console.log(req.headers);
        // console.log(`params`);
        // console.log(req.params);
        // typeof req['checksum'] !== 'undefined' && console.log(`checksum:${JSON.stringify(req['checksum'])}`);
        // typeof req['jar_path'] !== 'undefined' && console.log(`jar_path:${req['jar_path']}`);
        // console.log(`body`);
        // console.log(req.body);

        const now: Date = new Date();
        const save_path: string = join(process.cwd(), 'repo', String(now.getUTCFullYear()), String(now.getUTCMonth()), String(now.getUTCDate()));
        const temp_path: string = req['tmp_path'];
        const save_name: string = (Math.random().toString(36)+'00000000000000000').slice(2, 10+2);

        maven_repo.file_path = join(save_path, save_name).replace(process.cwd(), '');

        let rtn_val: boolean = false;
        if (repo === null) {
            // 없으면 생성
            rtn_val = await this.mavenService.addRepo(maven_repo);
        }
        else {
            // 있으면 & 버전이 올라가면 업데이트
            if ((repo['latest_version'] as string) > (maven_repo.version as string)) {
                res.status(HttpStatus.BAD_REQUEST).send();
                return;
            }
            rtn_val = await this.mavenService.updateRepo(maven_repo);
        }

        if (rtn_val) {
            if (typeof temp_path !== 'undefined' && temp_path.length > 0 && existsSync(temp_path)) {
                !existsSync(save_path) && mkdirSync(save_path, { recursive: true });
                renameSync(temp_path, join(save_path, save_name));
            }
        }
        existsSync(temp_path) && unlinkSync(temp_path);
        
        if (!rtn_val) {
            res.status(HttpStatus.BAD_REQUEST).send();
        }
        else {
            res.status(HttpStatus.OK).send();
        }
    }
}
