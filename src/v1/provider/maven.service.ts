import { Injectable } from '@nestjs/common';
import { AZSql } from 'azlib';
import { Database } from '../../common/database';

export interface MavenRepo {
    repo_id?: number;
    group_id?: string;
    artifact_id?: string;
    version?: string;
    md5?: string;
    sha1?: string;
    sha256?: string;
    sha512?: string;
    file_path?: string;
}

@Injectable()
export class MavenService {

    /**
     * 
     * @param group_id 
     * @param artifact_id 
     * @param version 
     * @returns 
     */
    async exists(group_id: string, artifact_id: string, version?: string): Promise<boolean> {
        const res: number = await new AZSql.Prepared(Database.getInstance().connection)
            .getAsync(
                `SELECT EXISTS(SELECT * FROM maven_repo WHERE group_id=@group_id AND artifact_id=@artifact_id) as cnt`, 
                { '@group_id': group_id, '@artifact_id': artifact_id }
            );
        return res > 0;
    }

    async addRepo(maven_repo: MavenRepo): Promise<boolean> {
        let rtn_val: boolean = false;
        let res: AZSql.Result = await new AZSql.Basic('maven_repo', new AZSql(Database.getInstance().connection))
            .setIsPrepared(true)
            .set('group_id', maven_repo.group_id as string)
            .set('artifact_id', maven_repo.artifact_id as string)
            .set('release_version', maven_repo.version as string)
            .set('latest_version', maven_repo.version as string)
            .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
            .doInsertAsync(true);
        if (typeof res.err === 'undefined' && typeof res.identity !== 'undefined' && (res.identity as number) > 0) {
            const repo_id: number = res.identity as number;

            const bql: AZSql.Basic = new AZSql.Basic('maven_repo_detail', new AZSql(Database.getInstance().connection));

            await bql
                .setIsPrepared(true)
                .set('is_release', 0)
                .where('repo_id', repo_id as number)
                .doUpdateAsync();

            res = await bql
                .setIsPrepared(true)
                .set('repo_id', repo_id as number)
                .set('version', maven_repo.version as string)
                .set('file_path', maven_repo.file_path as string)
                .set('is_release', 1)
                .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
                .doInsertAsync(true);

            rtn_val = true;
        }
        return rtn_val;
    }

    async updateRepo(maven_repo: MavenRepo): Promise<boolean> {
        let rtn_val: boolean = false;
        let res: AZSql.Result = await new AZSql.Basic('maven_repo', new AZSql(Database.getInstance().connection))
            .setIsPrepared(true)
            .set('release_version', maven_repo.version as string)
            .set('latest_version', maven_repo.version as string)
            .set('updated_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
            .where('repo_id', maven_repo.repo_id as number)
            .doUpdateAsync();
        if (typeof res.err === 'undefined' && typeof res.affected !== 'undefined' && (res.affected as number) > 0) {

            const bql: AZSql.Basic = new AZSql.Basic('maven_repo_detail', new AZSql(Database.getInstance().connection));

            await bql
                .setIsPrepared(true)
                .set('is_release', 0)
                .where('repo_id', maven_repo.repo_id as number)
                .doUpdateAsync();

            res = await bql
                .setIsPrepared(true)
                .set('repo_id', maven_repo.repo_id as number)
                .set('version', maven_repo.version as string)
                .set('file_path', maven_repo.file_path as string)
                .set('is_release', 1)
                .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
                .doInsertAsync(true);

            rtn_val = true;
        }
        return rtn_val;
    }

    async getRepo(group_id_or_repo_id: string|number, artifact_id?: string): Promise<object|null> {
        const bql: AZSql.Basic = new AZSql.Basic('maven_repo', new AZSql(Database.getInstance().connection))
            .setIsPrepared(true);
        if (typeof group_id_or_repo_id === 'string') {
            bql
                .where('group_id', group_id_or_repo_id as string)
                .where('artifact_id', artifact_id as string);
        }
        else {
            bql.where('repo_id', group_id_or_repo_id as number);
        }
        const res: Array<any> = await bql.doSelectAsync();
        //
        return res.length > 0 ? res[0] : null;
    }

    async getRepoVersions(repo_id: number): Promise<Array<string>> {
        const res: Array<any> = await new AZSql.Prepared(Database.getInstance().connection)
            .getListAsync(
                `SELECT version FROM maven_repo_detail WHERE repo_id=@repo_id`,
                { '@repo_id': repo_id }
            );
        const rtn_val: Array<string> = new Array<string>();
        for (let cnti: number = 0; cnti < res.length; cnti++) {
            rtn_val.push(res[cnti]['version']);
        }
        return rtn_val;
    }

    async getRepoDetail(group_id_or_repo_id: string|number, artifact_id?: string, version?: string): Promise<object|null> {
        let res: object|null = null;
        if (typeof group_id_or_repo_id === 'string') {
            if (typeof artifact_id === 'undefined' || typeof version === 'undefined') {
                return Promise.reject(new Error('invalid argument (undefined)'));
            }
            if ((artifact_id as string).length < 1 || (version as string).length < 1) {
                return Promise.reject(new Error('invalid argument (empty)'));
            }
        }
        switch (typeof group_id_or_repo_id) {
            case 'string':
                res = await new AZSql.Prepared(Database.getInstance().connection)
                    .getDataAsync(
`SELECT
 mr.repo_id, mr.group_id, mr.artifact_id, mr.release_version, mrd.version, mrd.repo_detail_id, mrd.file_path
FROM
 maven_repo as mr
 LEFT JOIN maven_repo_detail as mrd
  ON mr.repo_id = mrd.repo_id
WHERE
 mr.group_id = @group_id
 AND mr.artifact_id = @artifact_id
 AND mrd.version = @version
LIMIT 1`,
                        {
                            '@group_id': group_id_or_repo_id as string,
                            '@artifact_id': artifact_id as string,
                            '@version': version as string,
                        }
                    );
                break;
            case 'number':
                res = await new AZSql.Prepared(Database.getInstance().connection)
                    .getDataAsync(
`SELECT
 mr.repo_id, mr.group_id, mr.artifact_id, mr.release_version, mrd.version
FROM
 maven_repo as mr
 LEFT JOIN maven_repo_detail as mrd
  ON mr.repo_id = mrd.repo_id
WHERE
 mr.repo_id = @repo_id`,
 
                        { '@repo_id': group_id_or_repo_id as number, }
                    )
                break;
        }
        return Object.keys(res).length < 1 ? null : res;
    }

    async addAccessHistory(repo_id: number, repo_detail_id: number, access_key: string, remote_addr: string): Promise<boolean> {
        let rtn_val: boolean = false;
        let bql: AZSql.Basic = new AZSql.Basic('maven_repo_access_history_log', new AZSql(Database.getInstance().connection))
            .setIsPrepared(true);
        let res: AZSql.Result = await bql
            .set('repo_id', repo_id)
            .set('repo_detail_id', repo_detail_id)
            .set('access_key', access_key)
            .set('remote_addr', remote_addr)
            .doInsertAsync(true);
        if (res && res.affected as number > 0) {
            res = await new AZSql.Prepared(Database.getInstance().connection)
                .setIdentity(true)
                .executeAsync(
                    `INSERT INTO maven_repo_access_history
 (repo_id, access_count, updated_at)
VALUES (
 @repo_id, 1, strftime('%s','now')
)
ON CONFLICT (repo_id)
DO UPDATE SET access_count=access_count+1, updated_at=strftime('%s','now')`,
                    { '@repo_id': repo_id }
                );

            rtn_val = res && res.affected as number > 0;
        }
        return rtn_val;
    }
}
