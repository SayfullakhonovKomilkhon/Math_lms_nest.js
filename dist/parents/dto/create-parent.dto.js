"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateParentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const phone_1 = require("../../common/utils/phone");
class CreateParentDto {
}
exports.CreateParentDto = CreateParentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+998901234567',
        description: 'Phone number used as the login identifier',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, phone_1.normalizePhone)(value) : value),
    (0, class_validator_1.Matches)(/^\+?[0-9\s\-()]{6,20}$/, {
        message: 'phone must be a valid phone number',
    }),
    __metadata("design:type", String)
], CreateParentDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Parent123!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateParentDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Sherzod Valiyev' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateParentDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'IDs of students to link to this parent',
        example: ['student-id-1', 'student-id-2'],
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateParentDto.prototype, "studentIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        deprecated: true,
        description: 'Deprecated: use studentIds. Kept for backwards compatibility.',
        example: 'student-id',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateParentDto.prototype, "studentId", void 0);
//# sourceMappingURL=create-parent.dto.js.map