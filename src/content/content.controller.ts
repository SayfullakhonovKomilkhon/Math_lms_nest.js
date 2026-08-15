import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ContentService } from './content.service';
import { UpdateContentDraftDto } from './dto/update-content-draft.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { S3Service } from '../common/services/s3.service';

const CONTENT_ROLES = [Role.CONTENT_MANAGER, Role.SUPER_ADMIN];

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly s3: S3Service,
  ) {}

  @Post('media/upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload public website media' })
  async uploadMedia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл не передан');
    const url = await this.s3.uploadPublicContent(file);
    return {
      url,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Delete('media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Delete public website media' })
  async deleteMedia(@Body('url') url: string) {
    if (!url || !url.includes('/content/')) return { deleted: false };
    await this.s3.deleteFile(url);
    return { deleted: true };
  }

  @Get('public/:key')
  @ApiOperation({ summary: 'Get published website section content' })
  getPublic(@Param('key') key: string) {
    return this.contentService.getPublic(key);
  }

  @Get(':key')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Get section draft and published content' })
  getEditor(@Param('key') key: string) {
    return this.contentService.getEditor(key);
  }

  @Put(':key/draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Save section draft' })
  saveDraft(
    @Param('key') key: string,
    @Body() dto: UpdateContentDraftDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.contentService.saveDraft(key, dto.content, actorId);
  }

  @Post(':key/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Publish the current section draft' })
  publish(@Param('key') key: string, @CurrentUser('id') actorId: string) {
    return this.contentService.publish(key, actorId);
  }

  @Get(':key/revisions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Get recent section content revisions' })
  getRevisions(@Param('key') key: string) {
    return this.contentService.getRevisions(key);
  }

  @Post(':key/revisions/:revisionId/restore')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Restore a revision into the section draft' })
  restoreRevision(
    @Param('key') key: string,
    @Param('revisionId') revisionId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.contentService.restoreRevision(key, revisionId, actorId);
  }
}
