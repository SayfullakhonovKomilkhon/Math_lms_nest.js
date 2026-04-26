"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
function normalizePhone(raw) {
    if (!raw)
        return '';
    const digits = String(raw).replace(/\D+/g, '');
    if (!digits)
        return '';
    if (digits.startsWith('998') && digits.length === 12) {
        return '+' + digits;
    }
    if (digits.length === 9) {
        return '+998' + digits;
    }
    return '+' + digits;
}
//# sourceMappingURL=phone.js.map