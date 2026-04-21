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
exports.UpdateMyProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateMyProfileDto {
}
exports.UpdateMyProfileDto = UpdateMyProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'Alijon Valiyev' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateMyProfileDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: '+998901234567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], UpdateMyProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'student@mathcenter.uz' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateMyProfileDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Required when changing email or password',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMyProfileDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: 'NewPassword123!' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], UpdateMyProfileDto.prototype, "newPassword", void 0);
//# sourceMappingURL=update-my-profile.dto.js.map