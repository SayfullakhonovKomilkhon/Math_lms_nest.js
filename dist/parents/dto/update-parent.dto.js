"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateParentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_parent_dto_1 = require("./create-parent.dto");
class UpdateParentDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_parent_dto_1.CreateParentDto, ['email', 'password', 'studentId'])) {
}
exports.UpdateParentDto = UpdateParentDto;
//# sourceMappingURL=update-parent.dto.js.map