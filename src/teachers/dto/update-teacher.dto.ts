import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizePhone } from '../../common/utils/phone';

/**
 * Admin-editable teacher fields. Notably this is NOT extended from
 * CreateTeacherDto with `OmitType(['phone', 'password'])` — that pattern
 * accidentally stripped the contact-phone column too, because in the
 * create DTO `phone` doubles as the login. Login phone & password are
 * still managed separately via `PATCH /users/:id` (super-admin only).
 *
 * Here `phone` refers to the teacher's CONTACT phone stored on the
 * Teacher row, not the auth phone on the User row.
 */
export class UpdateTeacherDto {
  @ApiPropertyOptional({ example: 'Bobur Toshmatov' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Контактный телефон учителя (не логин для входа)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @Matches(/^\+?[0-9\s\-()]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ratePerStudent?: number;
}
