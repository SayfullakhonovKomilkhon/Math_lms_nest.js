import { IsObject } from 'class-validator';

export class UpdateContentDraftDto {
  @IsObject()
  content: Record<string, unknown>;
}
