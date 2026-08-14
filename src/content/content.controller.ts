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

  @Get('public/homepage')
  @ApiOperation({ summary: 'Get the published homepage content' })
  getPublicHomepage() {
    return this.contentService.getPublicHomepage();
  }

  @Get('homepage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Get homepage draft and published content' })
  getHomepageEditor() {
    return this.contentService.getHomepageEditor();
  }

  @Put('homepage/draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Save the homepage draft' })
  saveHomepageDraft(
    @Body() dto: UpdateContentDraftDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.contentService.saveHomepageDraft(dto.content, actorId);
  }

  @Post('homepage/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Publish the current homepage draft' })
  publishHomepage(@CurrentUser('id') actorId: string) {
    return this.contentService.publishHomepage(actorId);
  }

  @Get('homepage/revisions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Get recent homepage content revisions' })
  getHomepageRevisions() {
    return this.contentService.getHomepageRevisions();
  }

  @Post('homepage/revisions/:revisionId/restore')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CONTENT_ROLES)
  @ApiOperation({ summary: 'Restore a revision into the homepage draft' })
  restoreHomepageRevision(
    @Param('revisionId') revisionId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.contentService.restoreHomepageRevision(revisionId, actorId);
  }
}
