import { Controller } from '@nestjs/common';
import { ArchiveService } from './archive.service';

@Controller('v1/:access_key/archive')
export class ArchiveController {
    constructor(private readonly archiveService: ArchiveService) {}

    
}
