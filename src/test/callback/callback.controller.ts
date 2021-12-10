import { Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('callback')
export class CallbackController {

    private printParams(params: object): void {
        const keys: Array<string> = Object.keys(params);
        for (let cnti: number = 0; cnti < keys.length; cnti++) {
            const key: string = keys[cnti];
            console.log(`  > ${key}: ${params[key]}`);
        }
    }

    @Post('on/connect')
    onConnect(@Req() req: Request) {
        console.log(`- onConnect`);
        this.printParams(req.body);
        return req.body;
    }

    @Post('on/publish')
    onPublish(@Req() req: Request) {
        console.log(`- onPublish`);
        this.printParams(req.body);
        return req.body;
    }

    @Post('on/publish/done')
    onPublishDone(@Req() req: Request) {
        console.log(`- onPublishDone`);
        this.printParams(req.body);
        return req.body;
    }

    @Post('on/done')
    onDone(@Req() req: Request) {
        console.log(`- onDone`);
        this.printParams(req.body);
        return req.body;
    }

    @Post('on/play')
    onPlay(@Req() req: Request) {
        console.log(`- onPlay`);
        this.printParams(req.params);
        return req.params;
    }

    @Post('on/play/done')
    onPlayDone(@Req() req: Request) {
        console.log(`- onPlayDone`);
        this.printParams(req.body);
        return req.body;
    }

    @Post('on/record/done')
    onRecordDone(@Req() req: Request) {
        console.log(`- onRecordDone`);
        this.printParams(req.body);
        return req.body;
    }

    @Post('on/update')
    onUpdate(@Req() req: Request) {
        console.log(`- onUpdate`);
        this.printParams(req.body);
        return req.body;
    }
}
