import { Database } from '../../common/database';
import { AZSql } from 'azlib';

export class AuthProvider {
    static async has(access_key: string, remote_addr: string): Promise<boolean> {
        const res: Array<any> = await new AZSql.Prepared(Database.getInstance().connection)
            .getListAsync(
                `SELECT
 are.remote_addr, are.is_regexp
FROM
 auth as a
 LEFT JOIN auth_remote_expires as are
  ON a.auth_idx=are.auth_idx
WHERE
 a.access_key=@access_key
 AND strftime('%s','now') BETWEEN ifnull(are.enable_at, strftime('%s','now')) AND ifnull(are.expire_at, strftime('%s','now'))`,
                { '@access_key': access_key }
            );
        let rtn_val: boolean = false;
        for (let cnti: number = 0; cnti < res.length; cnti++) {
            const row: any = res[cnti];
            switch (row.is_regexp as number) {
                case 0:
                    rtn_val = (row.remote_addr as string) === remote_addr;
                    break;
                case 1:
                    rtn_val = new RegExp(row.remote_addr as string).test(remote_addr);
                    break;
            }
            if (rtn_val) break;
        }
        return rtn_val;
    }
}
