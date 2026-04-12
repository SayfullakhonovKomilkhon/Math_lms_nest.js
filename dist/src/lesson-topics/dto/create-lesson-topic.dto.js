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
exports.CreateLessonTopicDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateLessonTopicDto {
}
exports.CreateLessonTopicDto = CreateLessonTopicDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLessonTopicDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-15' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateLessonTopicDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Квадратные уравнения — метод дискриминанта' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateLessonTopicDto.prototype, "topic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: { links: [], notes: '' } }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateLessonTopicDto.prototype, "materials", void 0);
//# sourceMappingURL=create-lesson-topic.dto.js.map