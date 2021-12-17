import { Injectable } from '@nestjs/common';
import { AZSql } from 'azlib';
import { Database } from '../../common/database';
import { ArchiveRepo, ArchiveRepoDetail, ArchiveInfo } from '../_interface/archive.interface';

@Injectable()
export class ArchiveService {
    async has(group_id: string, artifact_id: string, version?: string): Promise<boolean> {
        const sql: AZSql.Prepared = new AZSql.Prepared(Database.getInstance().connection);
        let res: number = 0;
        if (typeof version === 'undefined') {
            res = await sql
                .getAsync(
                    `SELECT EXISTS(SELECT * FROM archive_repo WHERE group_id=@group_id AND artifact_id=@artifact_id) as cnt`, 
                    { '@group_id': group_id, '@artifact_id': artifact_id }
                );
        }
        else {
            res = await sql
                .getAsync(
                    `SELECT EXISTS(
 SELECT *
 FROM
  archive_repo as mr
  LEFT JOIN archive_repo_detail as mrd
   ON mr.repo_id=mrd.repo_id
 WHERE
  mr.group_id=@group_id
  AND mr.artifact_id=@artifact_id
  AND mrd.version=@version
) as cnt`, 
                    { '@group_id': group_id, '@artifact_id': artifact_id, '@version': version }
                );
        }
        return res > 0;
    }

    async addRepo(repo: ArchiveInfo): Promise<boolean> {
        let rtn_val: boolean = false;
        const repo_id: number = await new AZSql.Basic('archive_repo', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .set('group_id', repo.group_id as string)
            .set('artifact_id', repo.artifact_id as string)
            .set('latest_version', repo.version as string)
            .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
            .doInsertAsync(true)
            .catch((_err) => {
                return -1;
            });
        if (repo_id > 0) {
            const bql: AZSql.Basic = new AZSql.Basic('archive_repo_detail', new AZSql(Database.getInstance().connection));

            await bql
                .setPrepared(true)
                .set('repo_id', repo_id as number)
                .set('version', repo.version as string)
                .set('file_path', repo.file_path as string)
                .set('file_ext', repo.file_ext as string)
                .set('file_size', repo.file_size as number)
                .set('is_release', 1)
                .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
                .doInsertAsync();

            rtn_val = true;
        }
        return rtn_val;
    }

    async updateRepo(repo: ArchiveInfo, is_latest: boolean): Promise<boolean> {
        let rtn_val: boolean = false;
        let bql: AZSql.Basic = new AZSql.Basic('archive_repo', new AZSql(Database.getInstance().connection))
            .setPrepared(true);
        is_latest && bql
            .set('latest_version', repo.version as string);
        const affected: number = await bql
            .set('updated_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
            .where('repo_id', repo.repo_id as number)
            .doUpdateAsync()
            .catch((_err) => {
                return -1;
            });
        if (affected > 0) {
            bql = new AZSql.Basic('archive_repo_detail', new AZSql(Database.getInstance().connection));

            await bql
                .setPrepared(true)
                .set('repo_id', repo.repo_id as number)
                .set('version', repo.version as string)
                .set('file_path', repo.file_path as string)
                .set('file_ext', repo.file_ext as string)
                .set('file_size', repo.file_size as number)
                .set('is_release', is_latest ? 1 : 0)
                .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY)
                .doInsertAsync();

            rtn_val = true;
        }
        return rtn_val;
    }

    async getRepo(group_id_or_repo_id: string|number, artifact_id?: string): Promise<object|null> {
        const bql: AZSql.Basic = new AZSql.Basic('archive_repo', new AZSql(Database.getInstance().connection))
            .setPrepared(true);
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
                `SELECT version FROM archive_repo_detail WHERE repo_id=@repo_id`,
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
 mr.repo_id, mr.group_id, mr.artifact_id, mr.latest_version, mrd.version, mrd.repo_detail_id, mrd.file_path, mrd.file_ext, mrd.file_size
FROM
 archive_repo as mr
 LEFT JOIN archive_repo_detail as mrd
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
 mr.repo_id, mr.group_id, mr.artifact_id, mr.latest_version, mrd.version, mrd.repo_detail_id, mrd.file_path, mrd.file_ext
FROM
 archive_repo as mr
 LEFT JOIN archive_repo_detail as mrd
  ON mr.repo_id = mrd.repo_id
WHERE
 mr.repo_id = @repo_id`,
 
                        { '@repo_id': group_id_or_repo_id as number, }
                    )
                break;
        }
        return !res || Object.keys(res).length < 1 ? null : res;
    }

    async addAccessHistory(repo_id: number, repo_detail_id: number, access_key: string, remote_addr: string): Promise<boolean> {
        let rtn_val: boolean = false;
        let bql: AZSql.Basic = new AZSql.Basic('archive_repo_access_history_log', new AZSql(Database.getInstance().connection))
            .setPrepared(true);
        let affected: number = await bql
            .set('repo_id', repo_id)
            .set('repo_detail_id', repo_detail_id)
            .set('access_key', access_key)
            .set('remote_addr', remote_addr)
            .doInsertAsync(true)
            .catch((_err) => { return -1; });
        if (affected > 0) {
            affected = await new AZSql.Prepared(Database.getInstance().connection)
                // .setIdentity(true)
                .executeAsync(
                    `INSERT INTO archive_repo_access_history
 (repo_id, access_count, updated_at)
VALUES (
 @repo_id, 1, strftime('%s','now')
)
ON CONFLICT (repo_id) DO UPDATE
SET
 access_count=access_count+1,
 updated_at=strftime('%s','now')`,
                    { '@repo_id': repo_id }
                )
                .catch((_err) => { return -1; });

            rtn_val = affected > 0;
        }
        return rtn_val;
    }
}
