import { Controller, Get, Post, Patch, Put, Delete, Req, Res, Param, Body } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthProvider } from '../_provider/auth.provider';
import { Auth, AuthRemoteExpires } from '../_interface/auth.interface';
import { RegExps } from '../../common/define';
import { ApiRes } from '../../common/apires';

@Controller('v1/manage')
export class ManageController {
    private _insertExpire(auth_idx: number, row: AuthRemoteExpires): Promise<number> {
        row.auth_idx = auth_idx;
        return AuthProvider.addExpire(row);
    };

    @Post('auths')
    async addAuths(@Res() res: Response, @Body() req_model: Auth) {
        // validation
        if (typeof req_model.access_key !== 'string' || (req_model.access_key as string).trim().length < 1) {
            ApiRes.send(res, 0x000001);
            return;
        }
        typeof req_model.is_admin == 'undefined' && (req_model.is_admin = false);
        // exists check
        const exists: boolean = await AuthProvider.has(req_model.access_key);
        if (exists) {
            ApiRes.send(res, 0x000012);
            return;
        }
        // insert auth
        const auth_idx: number = await AuthProvider.add(req_model);
        if (auth_idx < 1) {
            ApiRes.send(res, 0x000001);
            return;
        }
        //
        if (typeof req_model.expires !== 'undefined' && Array.isArray(req_model.expires)) {
            let req_cnt: number = req_model.expires.length;
            let succ_cnt: number = 0;
            const pros: Array<Promise<number>> = new Array<Promise<number>>();
            for (let cnti: number = 0; cnti < req_cnt; cnti++) {
                pros.push(this._insertExpire(auth_idx, req_model.expires[cnti]));
            }
            //
            const results: Array<number> = await Promise.all(pros);
            //
            for (let cnti: number = 0; cnti < results.length; cnti++) {
                results[cnti] > 0 && ++succ_cnt;
            }
            if (req_cnt > succ_cnt) {
                ApiRes.send(res, 0x000021);
                return;
            }
        }
        ApiRes.send(res, 0x000000);
    }

    @Get('auths')
    async getAuths(): Promise<Array<any>> {
        // get data
        const auths: Array<any> = await AuthProvider.getAll();
        // get expires
        const pros_keys: Array<string> = new Array<string>();
        const pros: Array<Promise<any>> = new Array<Promise<any>>();
        for (let cnti: number = 0; cnti < auths.length; cnti++) {
            const row: any = auths[cnti];
            pros_keys.push(row['auth_idx']);
            pros.push(AuthProvider.getExpires(row['auth_idx']));
        }
        const results: Array<Array<any>> = await Promise.all(pros);
        // modification
        auths.forEach((row: any, _idx: number) => {
            //
            typeof row['is_admin'] !== 'undefined' &&
                (row['is_admin'] = row['is_admin'] === 1);
            typeof row['created_at'] !== 'undefined' &&
                (row['created_at'] = (row['created_at'] as string).replace(RegExps.DateFormat14, '$1$2$3$4$5$6'));
            //
            const idx: number = pros_keys.indexOf(row['auth_idx']);
            if (idx > -1) {
                results[idx].forEach((inner_row: any, _idx: number) => {
                    typeof inner_row['is_regexp'] !== 'undefined' && inner_row['is_regexp'] &&
                        (inner_row['is_regexp'] = inner_row['is_regexp'] === 1);
                    typeof inner_row['enable_at'] !== 'undefined' && inner_row['enable_at'] &&
                        (inner_row['enable_at'] = (inner_row['enable_at'] as string).replace(RegExps.DateFormat14, '$1$2$3$4$5$6'));
                    typeof inner_row['expire_at'] !== 'undefined' && inner_row['expire_at'] &&
                        (inner_row['expire_at'] = (inner_row['expire_at'] as string).replace(RegExps.DateFormat14, '$1$2$3$4$5$6'));
                });
                row['expires'] = results[idx];
            }
        });
        // sorting
        auths.sort((a: Auth, b: Auth): number => {
            return a.auth_idx - b.auth_idx;
        });
        return auths;
    }

    @Get('auths/:access_key')
    async getAuth(@Res({ passthrough: true }) res: Response, @Param('access_key') access_key: string): Promise<any> {
        // get data
        const auth: any = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // get expires
        const expires: Array<any> = await AuthProvider.getExpires(auth['auth_idx']);
        auth['expires'] = expires;
        return auth;
    }

    // @Patch('auths/:access_key')
    // updateAuth() {

    // }

    @Delete('auths/:access_key')
    async removeAuth(@Res() res: Response, @Param('access_key') access_key: string): Promise<any> {
        // get data
        const auth: Auth = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        //
        const pros: Array<Promise<boolean>> = new Array<Promise<boolean>>();
        // delete expires
        pros.push(AuthProvider.removeExpires(auth.auth_idx));
        // delete data
        pros.push(AuthProvider.remove(auth.auth_idx));
        const results: Array<boolean> = await Promise.all(pros);
        if (results.length < 2 || !results[1]) {
            ApiRes.send(res, 0x000011);
            return;
        }
        ApiRes.send(res, 0x000000);
    }

    @Post('auths/:access_key/expires')
    async addAuthExpires(@Res() res: Response, @Param('access_key') access_key: string, @Body() req_model: Array<AuthRemoteExpires>|AuthRemoteExpires) {
        // get data
        const auth: any = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        //
        let req_cnt: number = 1;
        let succ_cnt: number = 0;
        const pros: Array<Promise<number>> = new Array<Promise<number>>();
        if (Array.isArray(req_model)) {
            req_cnt = req_model.length;
            for (let cnti: number = 0; cnti < req_cnt; cnti++) {
                pros.push(this._insertExpire(auth['auth_idx'], req_model[cnti]));
            }
        }
        else {
            pros.push(this._insertExpire(auth['auth_idx'], req_model));
        }
        //
        const results: Array<number> = await Promise.all(pros);
        //
        for (let cnti: number = 0; cnti < results.length; cnti++) {
            results[cnti] > 0 && ++succ_cnt;
        }
        //
        if (succ_cnt < 1) {
            ApiRes.send(res, 0x000022);
            return;
        }
        if (req_cnt > succ_cnt) {
            ApiRes.send(res, 0x000021);
            return;
        }
        ApiRes.send(res, 0x000000);
    }

    @Get('auths/:access_key/expires')
    async getAuthExpires(@Res({ passthrough: true }) res: Response, @Param('access_key') access_key: string): Promise<any> {
        // get data
        const auth: Auth = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // get expires
        const expires: Array<any> = await AuthProvider.getExpires(auth['auth_idx']);
        return expires;
    }

    @Get('auths/:access_key/expires/:expire_idx')
    async getAuthExpire(@Res({ passthrough: true }) res: Response, @Param('access_key') access_key: string, @Param('expire_idx') expire_idx: number): Promise<any> {
        // get data
        const auth: Auth = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // get expire
        const expire: any = await AuthProvider.getExpire(auth.auth_idx as number, expire_idx);
        // modification
        // typeof expire['expire_idx'] !== 'undefined' && delete expire['expire_idx'];
        typeof expire['is_regexp'] !== 'undefined' && (expire['is_regexp'] = (expire['is_regexp'] === 1));
        typeof expire['enable_at'] !== 'undefined' && expire['enable_at'] &&
            (expire['enable_at'] = (expire['enable_at'] as string).replace(RegExps.DateFormat14, '$1$2$3$4$5$6'));
        typeof expire['expire_at'] !== 'undefined' && expire['expire_at'] &&
            (expire['expire_at'] = (expire['expire_at'] as string).replace(RegExps.DateFormat14, '$1$2$3$4$5$6'));
        return expire;
    }

    @Delete('auths/:access_key/expires/:expire_idx')
    async removeAuthExpire(@Res() res: Response, @Param('access_key') access_key: string, @Param('expire_idx') expire_idx: number): Promise<any> {
        // get data
        const auth: Auth = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // get expire
        const expire: any = await AuthProvider.getExpire(auth.auth_idx as number, expire_idx);
        if (expire === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // remove
        const result: boolean = await AuthProvider.removeExpire(expire['expire_idx']);
        if (!result) {
            ApiRes.send(res, 0x000011);
            return;
        }
        ApiRes.send(res, 0x000000);
    }

    @Patch('auths/:access_key/expires/:expire_idx')
    async updateAuthExpire(@Res() res: Response, @Param('access_key') access_key: string, @Param('expire_idx') expire_idx: number, @Body() req_model: AuthRemoteExpires): Promise<any> {
        // validation
        if (typeof req_model.enable_at !== 'undefined' && req_model.enable_at !== null && !RegExps.DateFormat14s.test(req_model.enable_at as string)) {
            ApiRes.send(res, 0x000001);
            return;
        }
        if (typeof req_model.expire_at !== 'undefined' && req_model.expire_at !== null && !RegExps.DateFormat14s.test(req_model.expire_at as string)) {
            ApiRes.send(res, 0x000001);
            return;
        }
        // get data
        const auth: Auth = await AuthProvider.get(access_key);
        if (auth === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // get expire
        const expire: any = await AuthProvider.getExpire(auth.auth_idx as number, expire_idx);
        if (expire === null) {
            ApiRes.send(res, 0x000011);
            return;
        }
        // update expire
        req_model.auth_idx = auth.auth_idx;
        req_model.expire_idx = expire_idx;
        const result: boolean = await AuthProvider.updateExpire(req_model);
        if (!result) {
            ApiRes.send(res, 0x000011);
            return;
        }
        ApiRes.send(res, 0x000000);
    }

    // @Get('mavens')
    // getMavens() {
    // }

    // @Get('mavens/:repo_id')
    // getMaven() {
    // }

    // @Delete('mavens/:repo_id')
    // removeMaven() {
    // }

    // @Get('archives')
    // getArchives() {
    // }

    // @Get('archives/:repo_id')
    // getArchive() {
    // }

    // @Delete('archives/:repo_id')
    // removeArchive() {
    // }
}
