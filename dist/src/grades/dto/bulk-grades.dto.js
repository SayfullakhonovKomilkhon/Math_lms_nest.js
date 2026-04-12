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
exports.BulkGradesDto = exports.GradeRecordDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class GradeRecordDto {
}
exports.GradeRecordDto = GradeRecordDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeRecordDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'null if student was absent' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Object)
], GradeRecordDto.prototype, "score", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeRecordDto.prototype, "comment", void 0);
class BulkGradesDto {
}
exports.BulkGradesDto = BulkGradesDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkGradesDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-15' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BulkGradesDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['PRACTICE', 'CONTROL', 'TEST'] }),
    (0, class_validator_1.IsIn)(['PRACTICE', 'CONTROL', 'TEST']),
    __metadata("design:type", String)
], BulkGradesDto.prototype, "lessonType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], BulkGradesDto.prototype, "maxScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [GradeRecordDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GradeRecordDto),
    __metadata("design:type", Array)
], BulkGradesDto.prototype, "records", void 0);
//# sourceMappingURL=bulk-grades.dto.js.map