import { Database } from '../../common/database';
import { AZSql } from 'azlib';
import { Auth, AuthRemoteExpires } from '../_interface/auth.interface';
import { EOL } from 'os';
import { RegExps } from '../../common/define';

export class AuthProvider {
    static async has(access_key: string, remote_addr_or_is_admin?: string|boolean, is_admin?: boolean): Promise<boolean> {
        let query: string;
        const param: any = { '@access_key': access_key };
        //
        if (typeof remote_addr_or_is_admin === 'undefined' || typeof remote_addr_or_is_admin === 'boolean') {
            query = remote_addr_or_is_admin as boolean ?
                `SELECT EXISTS(SELECT * FROM auth WHERE access_key=@access_key) as cnt` :
                `SELECT EXISTS(SELECT * FROM auth WHERE access_key=@access_key AND is_admin=@is_admin) as cnt`;
            param['@is_admin'] = remote_addr_or_is_admin as boolean ? 1 : 0;
            return await new AZSql.Prepared(Database.getInstance().connection)
                .getAsync(query, param) > 0;
        }
        else {
            query = `SELECT
 are.remote_addr, are.is_regexp
FROM
 auth as a
 LEFT JOIN auth_remote_expires as are
  ON a.auth_idx=are.auth_idx
WHERE
 a.access_key=@access_key
 AND strftime('%s','now') BETWEEN ifnull(are.enable_at, strftime('%s','now')) AND ifnull(are.expire_at, strftime('%s','now'))`;
        }
        //
        if (typeof is_admin !== 'undefined') {
            query += `${EOL} AND is_admin=@is_admin`;
            param['@is_admin'] = is_admin ? 1 : 0;
        }
        //
        const res: Array<any> = await new AZSql.Prepared(Database.getInstance().connection)
            .getListAsync(query, param);
        let rtn_val: boolean = false;
        for (let cnti: number = 0; cnti < res.length; cnti++) {
            const row: any = res[cnti];
            switch (row.is_regexp as number) {
                case 0:
                    rtn_val = (row.remote_addr as string) === remote_addr_or_is_admin as string;
                    break;
                case 1:
                    rtn_val = new RegExp(row.remote_addr as string).test(remote_addr_or_is_admin as string);
                    break;
            }
            if (rtn_val) break;
        }
        return rtn_val;
    }

    static async getAll(): Promise<Array<any>> {
        const res: Array<any> = await new AZSql.Prepared(Database.getInstance().connection)
            .getListAsync(
                `SELECT
 auth_idx, access_key, is_admin, datetime(created_at, 'unixepoch') as created_at
FROM
 auth
ORDER BY
 is_admin DESC, auth_idx`
            );
        return res;
    }

    static async get(access_key: string): Promise<object|null> {
        return await new AZSql.Prepared(Database.getInstance().connection)
            .getDataAsync(
                `SELECT
 auth_idx, access_key, is_admin, created_at
FROM
 auth
WHERE
 access_key=@access_key`,
                { '@access_key': access_key, }
            );
    }

    static async add(auth: Auth): Promise<number> {
        return await new AZSql.Basic('auth', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .set('access_key', auth.access_key)
            .set('is_admin', (auth.is_admin as boolean) ? 1 : 0)
            .set('created_at', `strftime('%s', 'now')`, AZSql.Basic.VALUETYPE.QUERY)
            .doInsertAsync(true);
    }

    static async remove(auth_idx: number): Promise<boolean> {
        return await new AZSql.Basic('auth', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .where('auth_idx', auth_idx)
            .doDeleteAsync() > 0;
    }

    static async getExpires(access_key_or_auth_idx: string|number): Promise<Array<any>> {
        let query: string;
        if (typeof access_key_or_auth_idx === 'string') {
            query = `SELECT
 ae.expire_idx, ae.remote_addr, ae.is_regexp,
 datetime(ae.enable_at, 'unixepoch') as enable_at,
 datetime(ae.expire_at, 'unixepoch') as expire_at
FROM
 auth_remote_expires as ae
 INNER JOIN auth as a
  ON ae.auth_idx=a.auth_idx
WHERE
 a.access_key=@key`;
        }
        else {
            query = `SELECT
 ae.expire_idx, ae.remote_addr, ae.is_regexp,
 datetime(ae.enable_at, 'unixepoch') as enable_at,
 datetime(ae.expire_at, 'unixepoch') as expire_at
FROM
 auth_remote_expires as ae
WHERE
ae.auth_idx=@key`;
        }
        return await new AZSql.Prepared(Database.getInstance().connection)
            .getListAsync(
                query,
                { '@key': access_key_or_auth_idx, }
            );
    }

    static async removeExpires(auth_idx: number): Promise<boolean> {
        return await new AZSql.Basic('auth_remote_expires', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .where('auth_idx', auth_idx)
            .doDeleteAsync() > 0;
    }

    static async getExpire(auth_idx: number, expire_idx: number): Promise<object|null> {
        return await new AZSql.Prepared(Database.getInstance().connection)
            .getDataAsync(
                `SELECT
 ae.expire_idx, ae.remote_addr, ae.is_regexp,
 datetime(ae.enable_at, 'unixepoch') as enable_at,
 datetime(ae.expire_at, 'unixepoch') as expire_at
FROM
 auth as a
 INNER JOIN auth_remote_expires as ae
  ON a.auth_idx=ae.auth_idx
WHERE
 a.auth_idx=@auth_idx
 AND ae.expire_idx=@expire_idx`,
                {
                    '@auth_idx': auth_idx,
                    '@expire_idx': expire_idx
                }
            );
    }

    static async updateExpire(expire: AuthRemoteExpires): Promise<boolean> {
        if (typeof expire.auth_idx === 'undefined') throw new Error('auth_idx undefined');
        if (
            typeof expire.remote_addr === 'undefined' &&
            typeof expire.is_regexp === 'undefined' &&
            typeof expire.enable_at === 'undefined' &&
            typeof expire.expire_at === 'undefined'
        ) {
            throw new Error('update target is not defined');
        }
        const bql: AZSql.Basic = new AZSql.Basic('auth_remote_expires', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .where('expire_idx', expire.expire_idx as number);
        typeof expire.remote_addr !== 'undefined' && bql.set('remote_addr', expire.remote_addr as string);
        typeof expire.is_regexp !== 'undefined' && bql.set('is_regexp', (expire.is_regexp as boolean) ? 1 : 0);
        if (typeof expire.enable_at !== 'undefined') {
            if (expire.enable_at === null) {
                bql.set('enable_at', expire.enable_at);
            }
            else {
                bql.set('enable_at', `strftime('%s', '${(expire.enable_at as string).replace(RegExps.DateFormat14s, '$1-$2-$3 $4:$5:$6')}')`, AZSql.BQuery.VALUETYPE.QUERY);
            }
        }
        if (typeof expire.expire_at !== 'undefined') {
            if (expire.expire_at === null) {
                bql.set('expire_at', expire.expire_at);
            }
            else {
                bql.set('expire_at', `strftime('%s', '${(expire.expire_at as string).replace(RegExps.DateFormat14s, '$1-$2-$3 $4:$5:$6')}')`, AZSql.BQuery.VALUETYPE.QUERY);
            }
        }
        return await bql.doUpdateAsync() > 0;
    }

    static async addExpire(expire: AuthRemoteExpires): Promise<number> {
        const bql: AZSql.Basic = new AZSql.Basic('auth_remote_expires', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .set('auth_idx', expire.auth_idx as number)
            .set('remote_addr', expire.remote_addr as string)
            .set('is_regexp', (expire.is_regexp as boolean) ? 1 : 0);
        typeof expire.enable_at !== 'undefined' && expire.enable_at !== null &&
            bql.set('enable_at', `strftime('%s', '${(expire.enable_at as string).replace(RegExps.DateFormat14s, '$1-$2-$3 $4:$5:$6')}')`, AZSql.Basic.VALUETYPE.QUERY);
        typeof expire.expire_at !== 'undefined' && expire.expire_at !== null &&
            bql.set('expire_at', `strftime('%s', '${(expire.expire_at as string).replace(RegExps.DateFormat14s, '$1-$2-$3 $4:$5:$6')}')`, AZSql.Basic.VALUETYPE.QUERY);
        return await bql.doInsertAsync(true);
    }

    static async removeExpire(expire_idx: number): Promise<boolean> {
        return await new AZSql.Basic('auth_remote_expires', new AZSql(Database.getInstance().connection))
            .setPrepared(true)
            .where('expire_idx', expire_idx)
            .doDeleteAsync() > 0;
    }
}
