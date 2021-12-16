import { Injectable } from '@nestjs/common';
import { AZSql } from 'azlib';
import { Database } from '../../common/database';

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
}
