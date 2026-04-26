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
exports.UpdateMeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const phone_1 = require("../../common/utils/phone");
class UpdateMeDto {
}
exports.UpdateMeDto = UpdateMeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'New phone (login)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (0, phone_1.normalizePhone)(value) : value),
    (0, class_validator_1.Matches)(/^\+?[0-9\s\-()]{6,20}$/, {
        message: 'phone must be a valid phone number',
    }),
    __metadata("design:type", String)
], UpdateMeDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'New password, min 8 chars' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], UpdateMeDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current password, required when changing phone or password',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMeDto.prototype, "currentPassword", void 0);
//# sourceMappingURL=update-me.dto.js.map