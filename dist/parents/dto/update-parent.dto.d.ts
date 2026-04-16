import { CreateParentDto } from './create-parent.dto';
declare const UpdateParentDto_base: import("@nestjs/common").Type<Partial<Omit<CreateParentDto, "email" | "password" | "studentId">>>;
export declare class UpdateParentDto extends UpdateParentDto_base {
}
export {};
