import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ContentService } from './content.service';
import { UpdateContentDraftDto } from './dto/update-content-draft.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const CONTENT_ROLES = [Role.CONTENT_MANAGER, Role.SUPER_ADMIN];

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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
