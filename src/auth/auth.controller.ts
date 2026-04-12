import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get tokens' })
  @ApiResponse({ status: 200, description: 'Returns accessToken, refreshToken and user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Returns new token pair' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    // Decode the refresh token to get userId before validating in service
    const decoded = this.decodeRefreshToken(dto.refreshToken);
    return this.authService.refresh(decoded.sub, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body: Partial<RefreshDto>,
  ) {
    await this.authService.logout(userId, body.refreshToken);
  }

  private decodeRefreshToken(token: string): { sub: string } {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload;
    } catch {
      return { sub: '' };
    }
  }
}
