"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const ExcelJS = __importStar(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_service_1 = require("../prisma/prisma.service");
function fmtDate(d) {
    if (!d)
        return '—';
    return new Date(d).toLocaleDateString('ru-RU');
}
function headerStyle(ws, row, colCount) {
    const r = ws.getRow(row);
    r.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > colCount)
            return;
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' },
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    r.height = 22;
}
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async paymentsExcel(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.groupId)
            where.student = { groupId: query.groupId };
        if (query.from || query.to) {
            where.createdAt = {};
            if (query.from)
                where.createdAt.gte = new Date(query.from);
            if (query.to)
                where.createdAt.lte = new Date(query.to);
        }
        const payments = await this.prisma.payment.findMany({
            where,
            include: {
                student: {
                    select: {
                        fullName: true,
                        group: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MathCenter';
        const ws = wb.addWorksheet('Платежи');
        ws.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'Ученик', key: 'student', width: 28 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Сумма', key: 'amount', width: 14 },
            { header: 'Статус', key: 'status', width: 16 },
            { header: 'Дата создания', key: 'createdAt', width: 18 },
            { header: 'Дата подтверждения', key: 'confirmedAt', width: 22 },
        ];
        headerStyle(ws, 1, 7);
        const statusLabels = {
            PENDING: 'Ожидает',
            CONFIRMED: 'Подтверждён',
            REJECTED: 'Отклонён',
        };
        payments.forEach((p, i) => {
            const row = ws.addRow({
                num: i + 1,
                student: p.student.fullName,
                group: p.student.group?.name ?? '—',
                amount: Number(p.amount),
                status: statusLabels[p.status] ?? p.status,
                createdAt: fmtDate(p.createdAt),
                confirmedAt: fmtDate(p.confirmedAt),
            });
            const statusColors = {
                Подтверждён: 'FFD1FAE5',
                Ожидает: 'FFFEF9C3',
                Отклонён: 'FFFEE2E2',
            };
            const bg = statusColors[statusLabels[p.status]] ?? 'FFFFFFFF';
            row.eachCell({ includeEmpty: true }, (cell, col) => {
                if (col > 7)
                    return;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bg },
                };
                if (col === 4) {
                    cell.numFmt = '#,##0.00 "сум"';
                    cell.alignment = { horizontal: 'right' };
                }
            });
        });
        const totalRow = ws.addRow({
            num: '',
            student: 'ИТОГО',
            group: '',
            amount: payments
                .filter((p) => p.status === client_1.PaymentStatus.CONFIRMED)
                .reduce((s, p) => s + Number(p.amount), 0),
            status: '',
            createdAt: '',
            confirmedAt: '',
        });
        totalRow.font = { bold: true };
        totalRow.getCell(4).numFmt = '#,##0.00 "сум"';
        ws.autoFilter = { from: 'A1', to: 'G1' };
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async financeExcel(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.groupId)
            where.student = { groupId: query.groupId };
        if (query.from || query.to) {
            where.createdAt = {};
            if (query.from)
                where.createdAt.gte = new Date(query.from);
            if (query.to)
                where.createdAt.lte = new Date(query.to);
        }
        const allPaymentsWhere = {};
        if (query.from || query.to) {
            allPaymentsWhere.createdAt = {};
            if (query.from)
                allPaymentsWhere.createdAt.gte = new Date(query.from);
            if (query.to)
                allPaymentsWhere.createdAt.lte = new Date(query.to);
        }
        const [payments, debtors] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    student: {
                        select: {
                            fullName: true,
                            phone: true,
                            group: { select: { name: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.student.findMany({
                where: {
                    isActive: true,
                    payments: {
                        none: {
                            status: client_1.PaymentStatus.CONFIRMED,
                            createdAt: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                            },
                        },
                    },
                },
                include: {
                    group: {
                        select: { name: true, teacher: { select: { fullName: true } } },
                    },
                    parents: {
                        select: { parent: { select: { fullName: true, phone: true } } },
                    },
                },
                orderBy: { fullName: 'asc' },
            }),
        ]);
        const statusLabels = {
            PENDING: 'Ожидает',
            CONFIRMED: 'Подтверждён',
            REJECTED: 'Отклонён',
        };
        const statusColors = {
            Подтверждён: 'FFD1FAE5',
            Ожидает: 'FFFEF9C3',
            Отклонён: 'FFFEE2E2',
        };
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MathCenter';
        const wsAll = wb.addWorksheet('Все оплаты');
        wsAll.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'Ученик', key: 'student', width: 28 },
            { header: 'Телефон', key: 'phone', width: 18 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Сумма', key: 'amount', width: 14 },
            { header: 'Статус', key: 'status', width: 16 },
            { header: 'Дата создания', key: 'createdAt', width: 18 },
            { header: 'Дата подтверждения', key: 'confirmedAt', width: 22 },
        ];
        headerStyle(wsAll, 1, 8);
        payments.forEach((p, i) => {
            const label = statusLabels[p.status] ?? p.status;
            const row = wsAll.addRow({
                num: i + 1,
                student: p.student.fullName,
                phone: p.student.phone ?? '—',
                group: p.student.group?.name ?? '—',
                amount: Number(p.amount),
                status: label,
                createdAt: fmtDate(p.createdAt),
                confirmedAt: fmtDate(p.confirmedAt),
            });
            const bg = statusColors[label] ?? 'FFFFFFFF';
            row.eachCell({ includeEmpty: true }, (cell, col) => {
                if (col > 8)
                    return;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bg },
                };
                if (col === 5) {
                    cell.numFmt = '#,##0.00 "сум"';
                    cell.alignment = { horizontal: 'right' };
                }
            });
        });
        const totalConfirmed = payments
            .filter((p) => p.status === client_1.PaymentStatus.CONFIRMED)
            .reduce((s, p) => s + Number(p.amount), 0);
        const totalRow = wsAll.addRow({
            num: '',
            student: 'ИТОГО подтверждённых',
            phone: '',
            group: '',
            amount: totalConfirmed,
            status: '',
            createdAt: '',
            confirmedAt: '',
        });
        totalRow.font = { bold: true };
        totalRow.getCell(5).numFmt = '#,##0.00 "сум"';
        wsAll.autoFilter = { from: 'A1', to: 'H1' };
        const wsDebt = wb.addWorksheet('Должники');
        wsDebt.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'Ученик', key: 'student', width: 28 },
            { header: 'Телефон', key: 'phone', width: 18 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Учитель', key: 'teacher', width: 24 },
            { header: 'Ежемес. взнос', key: 'fee', width: 16 },
            { header: 'Родитель', key: 'parent', width: 24 },
            { header: 'Тел. родителя', key: 'parentPhone', width: 18 },
        ];
        headerStyle(wsDebt, 1, 8);
        debtors.forEach((s, i) => {
            wsDebt
                .addRow({
                num: i + 1,
                student: s.fullName,
                phone: s.phone ?? '—',
                group: s.group?.name ?? '—',
                teacher: s.group?.teacher?.fullName ?? '—',
                fee: Number(s.monthlyFee),
                parent: s.parents?.[0]?.parent?.fullName ?? '—',
                parentPhone: s.parents?.[0]?.parent?.phone ?? '—',
            })
                .getCell(6).numFmt = '#,##0.00 "сум"';
        });
        wsDebt.autoFilter = { from: 'A1', to: 'H1' };
        const wsSummary = wb.addWorksheet('Сводка');
        wsSummary.columns = [
            { header: 'Показатель', key: 'label', width: 32 },
            { header: 'Значение', key: 'value', width: 20 },
        ];
        headerStyle(wsSummary, 1, 2);
        const totalPending = payments
            .filter((p) => p.status === client_1.PaymentStatus.PENDING)
            .reduce((s, p) => s + Number(p.amount), 0);
        const totalRejected = payments
            .filter((p) => p.status === client_1.PaymentStatus.REJECTED)
            .reduce((s, p) => s + Number(p.amount), 0);
        [
            { label: 'Всего оплат', value: payments.length },
            {
                label: 'Подтверждено (кол-во)',
                value: payments.filter((p) => p.status === client_1.PaymentStatus.CONFIRMED)
                    .length,
            },
            {
                label: 'Ожидает (кол-во)',
                value: payments.filter((p) => p.status === client_1.PaymentStatus.PENDING)
                    .length,
            },
            {
                label: 'Отклонено (кол-во)',
                value: payments.filter((p) => p.status === client_1.PaymentStatus.REJECTED)
                    .length,
            },
            { label: 'Сумма подтверждённых', value: totalConfirmed },
            { label: 'Сумма ожидающих', value: totalPending },
            { label: 'Сумма отклонённых', value: totalRejected },
            { label: 'Должники (текущий месяц)', value: debtors.length },
            { label: 'Дата отчёта', value: fmtDate(new Date()) },
        ].forEach((row) => {
            const r = wsSummary.addRow(row);
            const val = r.getCell(2);
            if (typeof row.value === 'number' && row.label.includes('Сумма')) {
                val.numFmt = '#,##0.00 "сум"';
            }
        });
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async financePdf(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.groupId)
            where.student = { groupId: query.groupId };
        if (query.from || query.to) {
            where.createdAt = {};
            if (query.from)
                where.createdAt.gte = new Date(query.from);
            if (query.to)
                where.createdAt.lte = new Date(query.to);
        }
        const payments = await this.prisma.payment.findMany({
            where,
            include: {
                student: {
                    select: { fullName: true, group: { select: { name: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                margin: 40,
                size: 'A4',
                layout: 'landscape',
            });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('MathCenter — Финансовый отчёт', { align: 'center' });
            if (query.from || query.to) {
                doc
                    .fontSize(10)
                    .font('Helvetica')
                    .text(`Период: ${query.from ? fmtDate(query.from) : '—'} — ${query.to ? fmtDate(query.to) : '—'}`, { align: 'center' });
            }
            doc
                .moveDown(0.5)
                .fontSize(10)
                .text(`Сформирован: ${fmtDate(new Date())}`, { align: 'right' })
                .moveDown(1);
            const colW = [30, 180, 120, 90, 90, 110, 130];
            const cols = [
                '№',
                'Ученик',
                'Группа',
                'Сумма',
                'Статус',
                'Создан',
                'Подтверждён',
            ];
            const startX = doc.page.margins.left;
            let y = doc.y;
            doc
                .rect(startX, y, colW.reduce((a, b) => a + b, 0), 20)
                .fill('#4F46E5');
            doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
            let x = startX;
            cols.forEach((c, i) => {
                doc.text(c, x + 3, y + 5, { width: colW[i] - 6, align: 'center' });
                x += colW[i];
            });
            doc.fillColor('black').font('Helvetica').fontSize(8);
            y += 20;
            const statusLabels = {
                PENDING: 'Ожидает',
                CONFIRMED: 'Подтверждён',
                REJECTED: 'Отклонён',
            };
            payments.forEach((p, i) => {
                if (y > doc.page.height - 80) {
                    doc.addPage();
                    y = doc.page.margins.top;
                }
                const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                doc
                    .rect(startX, y, colW.reduce((a, b) => a + b, 0), 18)
                    .fill(bg);
                doc.fillColor('#1E293B');
                const cells = [
                    String(i + 1),
                    p.student.fullName,
                    p.student.group?.name ?? '—',
                    `${Number(p.amount).toLocaleString('ru-RU')} сум`,
                    statusLabels[p.status] ?? p.status,
                    fmtDate(p.createdAt),
                    fmtDate(p.confirmedAt),
                ];
                x = startX;
                cells.forEach((c, ci) => {
                    doc.text(c, x + 3, y + 4, {
                        width: colW[ci] - 6,
                        align: ci === 3 ? 'right' : 'left',
                        lineBreak: false,
                    });
                    x += colW[ci];
                });
                y += 18;
            });
            const confirmed = payments
                .filter((p) => p.status === client_1.PaymentStatus.CONFIRMED)
                .reduce((s, p) => s + Number(p.amount), 0);
            doc
                .moveDown(1)
                .font('Helvetica-Bold')
                .fontSize(10)
                .text(`Итого подтверждённых: ${confirmed.toLocaleString('ru-RU')} сум`, { align: 'right' });
            doc.end();
        });
    }
    async paymentsPdf(query) {
        return this.financePdf(query);
    }
    async studentsExcel(query) {
        const where = {};
        if (query.groupId)
            where.groupId = query.groupId;
        if (query.isActive !== undefined)
            where.isActive = query.isActive === 'false' ? false : true;
        const students = await this.prisma.student.findMany({
            where,
            include: {
                group: {
                    select: { name: true, teacher: { select: { fullName: true } } },
                },
                parents: {
                    select: { parent: { select: { fullName: true, phone: true } } },
                },
            },
            orderBy: { fullName: 'asc' },
        });
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MathCenter';
        const ws = wb.addWorksheet('Ученики');
        ws.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'ФИО', key: 'fullName', width: 28 },
            { header: 'Телефон', key: 'phone', width: 18 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Учитель', key: 'teacher', width: 24 },
            { header: 'Ежемес. оплата', key: 'monthlyFee', width: 18 },
            { header: 'Родитель', key: 'parent', width: 24 },
            { header: 'Тел. родителя', key: 'parentPhone', width: 18 },
            { header: 'Зачислен', key: 'enrolledAt', width: 16 },
            { header: 'Статус', key: 'status', width: 12 },
        ];
        headerStyle(ws, 1, 10);
        students.forEach((s, i) => {
            const row = ws.addRow({
                num: i + 1,
                fullName: s.fullName,
                phone: s.phone ?? '—',
                group: s.group?.name ?? '—',
                teacher: s.group?.teacher?.fullName ?? '—',
                monthlyFee: Number(s.monthlyFee),
                parent: s.parents?.[0]?.parent?.fullName ?? '—',
                parentPhone: s.parents?.[0]?.parent?.phone ?? '—',
                enrolledAt: fmtDate(s.enrolledAt),
                status: s.isActive ? 'Активен' : 'Неактивен',
            });
            row.getCell(6).numFmt = '#,##0.00 "сум"';
            if (!s.isActive) {
                row.eachCell({ includeEmpty: true }, (cell, col) => {
                    if (col > 10)
                        return;
                    cell.font = { color: { argb: 'FF94A3B8' } };
                });
            }
        });
        ws.autoFilter = { from: 'A1', to: 'J1' };
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async attendanceExcel(query) {
        const where = {};
        if (query.groupId)
            where.groupId = query.groupId;
        if (query.from || query.to) {
            where.date = {};
            if (query.from)
                where.date.gte = new Date(query.from);
            if (query.to)
                where.date.lte = new Date(query.to);
        }
        const records = await this.prisma.attendance.findMany({
            where,
            include: {
                student: { select: { fullName: true } },
                group: { select: { name: true } },
            },
            orderBy: [{ date: 'desc' }, { student: { fullName: 'asc' } }],
        });
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MathCenter';
        const ws = wb.addWorksheet('Посещаемость');
        ws.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'Ученик', key: 'student', width: 28 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Дата', key: 'date', width: 14 },
            { header: 'Тип занятия', key: 'lessonType', width: 16 },
            { header: 'Статус', key: 'status', width: 18 },
        ];
        headerStyle(ws, 1, 6);
        const statusLabels = {
            PRESENT: 'Присутствовал',
            ABSENT: 'Отсутствовал',
            LATE: 'Опоздал',
        };
        const lessonLabels = {
            REGULAR: 'Обычное',
            PRACTICE: 'Практика',
            CONTROL: 'Контрольная',
            TEST: 'Тест',
        };
        records.forEach((r, i) => {
            const statusLabel = statusLabels[r.status] ?? r.status;
            const row = ws.addRow({
                num: i + 1,
                student: r.student.fullName,
                group: r.group.name,
                date: fmtDate(r.date),
                lessonType: lessonLabels[r.lessonType] ?? r.lessonType,
                status: statusLabel,
            });
            const statusColors = {
                Присутствовал: 'FFD1FAE5',
                Опоздал: 'FFFEF9C3',
                Отсутствовал: 'FFFEE2E2',
            };
            const bg = statusColors[statusLabel] ?? 'FFFFFFFF';
            row.getCell(6).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bg },
            };
        });
        ws.autoFilter = { from: 'A1', to: 'F1' };
        const wsSummary = wb.addWorksheet('Сводка по группам');
        wsSummary.columns = [
            { header: 'Группа', key: 'group', width: 24 },
            { header: 'Всего записей', key: 'total', width: 16 },
            { header: 'Присутствовал', key: 'present', width: 16 },
            { header: 'Опоздал', key: 'late', width: 14 },
            { header: 'Отсутствовал', key: 'absent', width: 16 },
            { header: 'Посещаемость %', key: 'pct', width: 18 },
        ];
        headerStyle(wsSummary, 1, 6);
        const byGroup = new Map();
        for (const r of records) {
            const entry = byGroup.get(r.group.name) ?? {
                present: 0,
                late: 0,
                absent: 0,
            };
            if (r.status === 'PRESENT')
                entry.present++;
            else if (r.status === 'LATE')
                entry.late++;
            else
                entry.absent++;
            byGroup.set(r.group.name, entry);
        }
        for (const [groupName, counts] of byGroup) {
            const total = counts.present + counts.late + counts.absent;
            const pct = total > 0
                ? Math.round(((counts.present + counts.late) / total) * 100)
                : 0;
            const row = wsSummary.addRow({
                group: groupName,
                total,
                present: counts.present,
                late: counts.late,
                absent: counts.absent,
                pct: `${pct}%`,
            });
            const pctCell = row.getCell(6);
            pctCell.font = {
                bold: true,
                color: {
                    argb: pct >= 80 ? 'FF16A34A' : pct >= 60 ? 'FFD97706' : 'FFDC2626',
                },
            };
        }
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async gradesExcel(query) {
        const where = {};
        if (query.from || query.to) {
            where.createdAt = {};
            if (query.from)
                where.createdAt.gte = new Date(query.from);
            if (query.to)
                where.createdAt.lte = new Date(query.to);
        }
        const grades = await this.prisma.grade.findMany({
            where,
            include: {
                student: {
                    select: {
                        fullName: true,
                        group: {
                            select: { name: true, teacher: { select: { fullName: true } } },
                        },
                    },
                },
            },
            orderBy: [{ student: { fullName: 'asc' } }, { createdAt: 'desc' }],
        });
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MathCenter';
        const wsGrades = wb.addWorksheet('Оценки');
        wsGrades.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'Ученик', key: 'student', width: 28 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Учитель', key: 'teacher', width: 24 },
            { header: 'Тип занятия', key: 'lessonType', width: 20 },
            { header: 'Балл', key: 'score', width: 10 },
            { header: 'Макс. балл', key: 'maxScore', width: 12 },
            { header: '%', key: 'pct', width: 8 },
            { header: 'Дата', key: 'date', width: 14 },
        ];
        headerStyle(wsGrades, 1, 9);
        const lessonTypeLabels = {
            REGULAR: 'Обычное',
            PRACTICE: 'Практика',
            CONTROL: 'Контрольная',
            TEST: 'Тест',
        };
        grades.forEach((g, i) => {
            const score = Number(g.score);
            const maxScore = Number(g.maxScore);
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            const row = wsGrades.addRow({
                num: i + 1,
                student: g.student.fullName,
                group: g.student.group?.name ?? '—',
                teacher: g.student.group?.teacher?.fullName ?? '—',
                lessonType: lessonTypeLabels[g.lessonType] ?? g.lessonType,
                score,
                maxScore,
                pct: `${pct}%`,
                date: fmtDate(g.date),
            });
            const pctCell = row.getCell(8);
            pctCell.font = {
                color: {
                    argb: pct >= 80 ? 'FF16A34A' : pct >= 60 ? 'FFD97706' : 'FFDC2626',
                },
            };
        });
        wsGrades.autoFilter = { from: 'A1', to: 'I1' };
        const wsRating = wb.addWorksheet('Рейтинг');
        wsRating.columns = [
            { header: '#', key: 'rank', width: 6 },
            { header: 'Ученик', key: 'student', width: 28 },
            { header: 'Группа', key: 'group', width: 20 },
            { header: 'Работ', key: 'total', width: 10 },
            { header: 'Средний балл %', key: 'avg', width: 18 },
        ];
        headerStyle(wsRating, 1, 5);
        const studentMap = new Map();
        for (const g of grades) {
            const score = Number(g.score);
            const maxScore = Number(g.maxScore);
            const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const entry = studentMap.get(g.studentId) ?? {
                name: g.student.fullName,
                group: g.student.group?.name ?? '—',
                scores: [],
            };
            entry.scores.push(pct);
            studentMap.set(g.studentId, entry);
        }
        const ranking = Array.from(studentMap.values())
            .map((s) => ({
            ...s,
            avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
        }))
            .sort((a, b) => b.avg - a.avg);
        ranking.forEach((s, i) => {
            const row = wsRating.addRow({
                rank: i + 1,
                student: s.name,
                group: s.group,
                total: s.scores.length,
                avg: `${s.avg}%`,
            });
            row.getCell(5).font = {
                bold: i < 3,
                color: {
                    argb: s.avg >= 80 ? 'FF16A34A' : s.avg >= 60 ? 'FFD97706' : 'FFDC2626',
                },
            };
        });
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
    async salaryExcel(query) {
        const teachers = await this.prisma.teacher.findMany({
            where: { isActive: true },
            include: {
                groups: {
                    where: { isActive: true },
                    include: {
                        _count: { select: { students: { where: { isActive: true } } } },
                        attendances: query.from || query.to
                            ? {
                                where: {
                                    date: {
                                        gte: query.from ? new Date(query.from) : undefined,
                                        lte: query.to ? new Date(query.to) : undefined,
                                    },
                                },
                                select: { status: true },
                            }
                            : { select: { status: true } },
                    },
                },
            },
            orderBy: { fullName: 'asc' },
        });
        const wb = new ExcelJS.Workbook();
        wb.creator = 'MathCenter';
        const ws = wb.addWorksheet('Зарплаты');
        ws.columns = [
            { header: '№', key: 'num', width: 6 },
            { header: 'Учитель', key: 'fullName', width: 28 },
            { header: 'Телефон', key: 'phone', width: 18 },
            { header: 'Групп', key: 'groups', width: 10 },
            { header: 'Учеников', key: 'students', width: 12 },
            { header: 'Ставка / уч.', key: 'rate', width: 16 },
            { header: 'Посещ. %', key: 'att', width: 12 },
            { header: 'К выплате', key: 'salary', width: 16 },
        ];
        headerStyle(ws, 1, 8);
        let grandTotal = 0;
        teachers.forEach((t, i) => {
            const studentCount = t.groups.reduce((s, g) => s + g._count.students, 0);
            const rate = Number(t.ratePerStudent);
            const totalSalary = studentCount * rate;
            grandTotal += totalSalary;
            const allAtt = t.groups.flatMap((g) => g.attendances);
            const attPct = allAtt.length > 0
                ? Math.round((allAtt.filter((a) => a.status !== 'ABSENT').length /
                    allAtt.length) *
                    100)
                : 0;
            const row = ws.addRow({
                num: i + 1,
                fullName: t.fullName,
                phone: t.phone ?? '—',
                groups: t.groups.length,
                students: studentCount,
                rate,
                att: `${attPct}%`,
                salary: totalSalary,
            });
            row.getCell(6).numFmt = '#,##0 "сум"';
            row.getCell(8).numFmt = '#,##0 "сум"';
            row.getCell(8).font = { bold: true };
        });
        const totalRow = ws.addRow({
            num: '',
            fullName: 'ИТОГО',
            phone: '',
            groups: '',
            students: '',
            rate: '',
            att: '',
            salary: grandTotal,
        });
        totalRow.font = { bold: true };
        totalRow.getCell(8).numFmt = '#,##0 "сум"';
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEde9fe' },
        };
        const buf = await wb.xlsx.writeBuffer();
        return Buffer.from(buf);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map