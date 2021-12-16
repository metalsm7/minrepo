import { Controller, Get, Put, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ArchiveService } from './archive.service';
import { ArchiveInfo } from '../_interface/archive.interface';
import { ApiRes } from '../../common/apires';
import { RegExps } from '../../common/define';

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
    get(@Param('version') version: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
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
}
