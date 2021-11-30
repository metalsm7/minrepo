import { Controller, Get, Render, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('v1/doc')
export class DocController {
    @Get()
    @Render('doc/redoc')
    get() {
        return {};
    }

    @Get('document')
    document(): StreamableFile {
        console.log(`path:${join(process.cwd(), 'resource', 'openapi.v1.yaml')}`);
        return new StreamableFile(createReadStream(join(process.cwd(), 'data', 'openapi.v1.yaml')));
    }
}
